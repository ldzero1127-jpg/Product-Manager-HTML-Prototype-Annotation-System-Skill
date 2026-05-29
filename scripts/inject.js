/**
 * Prototype Annotator — Injection Script
 * 
 * Usage: node inject.js <target-html-file> <skill-dir> [annotations-js-file]
 * 
 * 功能：将标注系统模板注入到目标HTML文件中。
 * 
 * 注入内容：
 *   1. styles.css → 在 </head> 前插入 <style> 标签
 *   2. toolbar.html + panel.html + card.html → 在 </body> 前插入 HTML 框架
 *   3. framework.js → 在 </body> 前插入 <script> 标签
 *   4. ANNOTATIONS 数据 → 在 framework.js 前插入 <script> 标签
 * 
 * 要求：目标HTML需先通过 backup.js 备份。
 */

const fs = require('fs');
const path = require('path');

(function() {
  'use strict';

  var args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('用法: node inject.js <目标HTML文件> <skill目录> [annotations-js文件]');
    process.exit(1);
  }

  var targetPath = path.resolve(args[0]);
  var skillDir = path.resolve(args[1]);
  var annotationsFile = args.length > 2 ? path.resolve(args[2]) : null;

  if (!fs.existsSync(targetPath)) {
    console.error('错误：目标HTML文件不存在 ——', targetPath);
    process.exit(1);
  }
  if (!fs.existsSync(skillDir)) {
    console.error('错误：skill目录不存在 ——', skillDir);
    process.exit(1);
  }

  var templatesDir = path.join(skillDir, 'assets', 'templates');

  // 1. Read target HTML
  var html = fs.readFileSync(targetPath, 'utf8');

  // 2. Read template files
  var stylesCss = readFile(path.join(templatesDir, 'styles.css'));
  var toolbarHtml = readFile(path.join(templatesDir, 'toolbar.html'));
  var panelHtml = readFile(path.join(templatesDir, 'panel.html'));
  var cardHtml = readFile(path.join(templatesDir, 'card.html'));
  var frameworkJs = readFile(path.join(templatesDir, 'framework.js'));

  // 3. Read ANNOTATIONS data (if provided)
  var annotationsJs = '';
  if (annotationsFile && fs.existsSync(annotationsFile)) {
    annotationsJs = fs.readFileSync(annotationsFile, 'utf8');
  }

  // 4. Build injection blocks
  var styleBlock = '<style>\n/* === Prototype Annotator Styles === */\n' + stylesCss + '\n</style>';
  var htmlFramework = '\n<!-- === Prototype Annotator Framework === -->\n' +
    toolbarHtml + '\n' + panelHtml + '\n' + cardHtml;
  var scriptBlock = '<script>\n/* === Prototype Annotator Script === */\n' + frameworkJs + '\n</script>';

  // 5. Inject
  var changed = false;

  // Remove any previously injected annotation system (idempotent)
  // Remove all HTML framework copies (toolbar + panel + card)
  html = html.replace(/<!-- === Prototype Annotator Framework === -->[\s\S]*?(?=<\/body>)/g, '');
  // Also remove orphan framework divs that lost their comment marker
  html = html.replace(/<div class="anno-toolbar-combo">[\s\S]*?<\/div>\s*<\/div>\s*$/gm, '');
  // Remove injected styles
  html = html.replace(/<style>\s*\/\* === Prototype Annotator Styles === \*\/[\s\S]*?<\/style>/g, '');
  // Remove injected scripts (data + framework)
  html = html.replace(/<script>\s*\/\* === Prototype Annotator (Data|Script) === \*\/[\s\S]*?<\/script>/g, '');
  // Clean extra blank lines from removals
  html = html.replace(/\n{3,}/g, '\n\n');

  // Inject styles before </head>
  if (html.includes('</head>')) {
    html = html.replace('</head>', styleBlock + '\n</head>');
    changed = true;
    console.log('已注入: styles.css');
  } else {
    console.error('警告：未找到 </head> 标签，无法注入样式');
  }

  // Inject ANNOTATIONS data before </body>
  if (annotationsJs && html.includes('</body>')) {
    var annoDataBlock = '<script>\n/* === Prototype Annotator Data === */\n' +
      'var ANNOTATIONS = ' + annotationsJs + ';\n</script>';
    html = html.replace('</body>', annoDataBlock + '\n' + '</body>');
    console.log('已注入: ANNOTATIONS 数据');
  }

  // Inject HTML framework + JS before </body>
  if (html.includes('</body>')) {
    html = html.replace('</body>', htmlFramework + '\n' + scriptBlock + '\n</body>');
    changed = true;
    console.log('已注入: HTML框架 + framework.js');
  } else {
    console.error('警告：未找到 </body> 标签，无法注入框架');
  }

  // 6. Write back
  if (changed) {
    fs.writeFileSync(targetPath, html, 'utf8');
    console.log('\n注入完成: ' + targetPath);
  } else {
    console.log('未执行任何注入（文件可能缺少 </head> 或 </body> 标签）');
  }
})();

function readFile(filePath) {
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf8');
  }
  console.error('警告：模板文件不存在 ——', filePath);
  return '';
}
