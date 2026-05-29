/**
 * Prototype Annotator — Backup Script
 * 
 * Usage: node backup.js <target-html-file>
 * Output: <target-html-file>.bak
 * 
 * 功能：将目标HTML文件复制为 .bak 备份文件。
 * 如果备份文件已存在，会追加时间戳后缀避免覆盖历史备份。
 */

const fs = require('fs');
const path = require('path');

(function() {
  'use strict';

  var args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('用法: node backup.js <目标HTML文件>');
    process.exit(1);
  }

  var sourcePath = path.resolve(args[0]);

  if (!fs.existsSync(sourcePath)) {
    console.error('错误：文件不存在 ——', sourcePath);
    process.exit(1);
  }

  var ext = path.extname(sourcePath);
  var baseName = path.basename(sourcePath, ext);
  var dir = path.dirname(sourcePath);
  var bakPath = path.join(dir, baseName + ext + '.bak');

  // 如果备份已存在，追加时间戳
  if (fs.existsSync(bakPath)) {
    var ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    bakPath = path.join(dir, baseName + ext + '.' + ts + '.bak');
  }

  fs.copyFileSync(sourcePath, bakPath);
  console.log('备份成功: ' + bakPath);
})();
