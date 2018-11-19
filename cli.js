#!/usr/bin/env node
var path = require('path');
var fs = require('fs');
var program = require('commander');
var ini = require('ini');
var echo = require('node-echo');
var extend = require('extend');
var async = require('async');
var request = require('request');
var exec = require('child_process').exec;

var registries = require('./registries.json');
var PKG = require('./package.json');
var CGRRC = path.join(process.env.HOME, '.cgrrc');
var getNpmR = 'npm config get registry';
var setNpmR = 'npm config set registry';
var getYarnR = 'yarn config get registry';
var setYarnR = 'yarn config set registry';

program.version(PKG.version);

program
  .command('ls')
  .description('List all the registries')
  .action(onList);

program
  .command('current')
  .description('Show current registry name')
  .action(showCurrent);

program
  .command('use <registry> [type]')
  .description('Change registry to registry')
  .action(onUse);

program
  .command('add <registry> <url> [home]')
  .description('Add one custom registry')
  .action(onAdd);

program
  .command('del <registry>')
  .description('Delete one custom registry')
  .action(onDel);

program
  .command('test [registry]')
  .description('Show response time for specific or all registries')
  .action(onTest);

program
  .command('help')
  .description('Print this help')
  .action(function() {
    program.outputHelp();
  });

program.parse(process.argv);

if (process.argv.length === 2) {
  program.outputHelp();
}

/*//////////////// cmd methods /////////////////*/

function onList() {
  getCurrentRegistry(function(curArr) {
    var info = [''];
    var allRegistries = getAllRegistry();

    Object.keys(allRegistries).forEach(function(key) {
      var item = allRegistries[key];
      var prefixIndex = curArr.indexOf(item.registry);
      var prefix =
        prefixIndex === -1
          ? '  '
          : `${curArr.length === 1 ? '*' : prefixIndex === 0 ? 'N' : 'Y'} `;
      info.push(prefix + key + line(key, 8) + item.registry);
    });

    info.push('');
    printMsg(info);
  });
}

function showCurrent() {
  getCurrentRegistry(function(curArr) {
    var info = [''];
    var allRegistries = getAllRegistry();

    Object.keys(allRegistries).forEach(function(key) {
      var item = allRegistries[key];
      var prefixIndex = curArr.indexOf(item.registry);
      if (prefixIndex !== -1) {
        info.push(`${curArr.length === 1 ? '*' : prefixIndex === 0 ? 'N' : 'Y'} ${key}`);
      }
    });

    info.push('');
    printMsg(info);
  });
}

function onUse(name, type) {
  var allRegistries = getAllRegistry();
  if (allRegistries.hasOwnProperty(name)) {
    var registry = allRegistries[name];
    if (!type) {
      exec(`${setNpmR} ${registry.registry}`, function(errN, stdoutN, stderrN) {
        if (errN) return exit(stderrN);
        printMsg(['', `   npm Registry has been set to: ${registry.registry}`]);
        exec(`${setYarnR} ${registry.registry}`, function(errY, stdoutY, stderrY) {
          if (errY) return exit(stderrY);
          printMsg([`   yarn Registry has been set to: ${registry.registry}`, '']);
        });
      });
    } else if (type.toLowerCase() === 'npm' || type.toLowerCase() === 'n') {
      exec(`${setNpmR} ${registry.registry}`, function(err, stdout, stderr) {
        if (err) return exit(stderr);
        printMsg(['', `   npm Registry has been set to: ${registry.registry}`, '']);
      });
    } else if (type.toLowerCase() === 'yarn' || type.toLowerCase() === 'y') {
      exec(`${setYarnR} ${registry.registry}`, function(err, stdout, stderr) {
        if (err) return exit(stderr);
        printMsg(['', `   yarn Registry has been set to: ${registry.registry}`, '']);
      });
    } else {
      printMsg([
        '',
        '   cgr use <registry> [type]',
        '   type must be oneOf yarn | y | npm | n',
        ''
      ]);
    }
  } else {
    printMsg(['', '   Not find registry: ' + name, '']);
  }
}

function onDel(name) {
  var customRegistries = getCustomRegistry();
  if (!customRegistries.hasOwnProperty(name)) return;
  getCurrentRegistry(function(curArr) {
    if (curArr.indexOf(customRegistries[name].registry) !== -1) {
      onUse('npm');
    }
    delete customRegistries[name];
    setCustomRegistry(customRegistries, function(err) {
      if (err) return exit(err);
      printMsg(['', '    delete registry ' + name + ' success', '']);
    });
  });
}

function onAdd(name, url, home) {
  var customRegistries = getCustomRegistry();
  if (customRegistries.hasOwnProperty(name)) return;
  var config = (customRegistries[name] = {});
  if (url[url.length - 1] !== '/') url += '/'; // ensure url end with /
  config.registry = url;
  if (home) {
    config.home = home;
  }
  setCustomRegistry(customRegistries, function(err) {
    if (err) return exit(err);
    printMsg(['', '    add registry ' + name + ' success', '']);
  });
}

function onTest(registry) {
  var allRegistries = getAllRegistry();

  var toTest;

  if (registry) {
    if (!allRegistries.hasOwnProperty(registry)) {
      return;
    }
    toTest = { [registry]: allRegistries[registry] };
  } else {
    toTest = allRegistries;
  }

  async.map(
    Object.keys(toTest),
    function(name, cbk) {
      var registry = toTest[name];
      var start = +new Date();
      request(registry.registry + 'pedding', function(error) {
        cbk(null, {
          name: name,
          registry: registry.registry,
          time: +new Date() - start,
          error: error ? true : false
        });
      });
    },
    function(err, results) {
      getCurrentRegistry(function(curArr) {
        var msg = [''];
        results.forEach(function(result) {
          var prefixIndex = curArr.indexOf(result.registry);
          var prefix =
            prefixIndex === -1
              ? '  '
              : `${curArr.length === 1 ? '*' : prefixIndex === 0 ? 'N' : 'Y'} `;
          var suffix = result.error ? 'Fetch Error' : result.time + 'ms';
          msg.push(prefix + result.name + line(result.name, 8) + suffix);
        });
        msg.push('');
        printMsg(msg);
      });
    }
  );
}

/*//////////////// helper methods /////////////////*/

/*
 * get current registry
 */
function getCurrentRegistry(cbk) {
  exec(getNpmR, function(errN, stdoutN, stderrN) {
    if (errN) return exit(stderrN);
    exec(getYarnR, function(errY, stdoutY, stderrY) {
      if (errY) return exit(stderrY);
      if (stdoutN.trim() === stdoutY.trim()) {
        cbk([stdoutN.trim()]);
      } else {
        cbk([stdoutN.trim(), stdoutY.trim()]);
      }
    });
  });
}

function getCustomRegistry() {
  return fs.existsSync(CGRRC) ? ini.parse(fs.readFileSync(CGRRC, 'utf-8')) : {};
}

function setCustomRegistry(config, cbk) {
  echo(ini.stringify(config), '>', CGRRC, cbk);
}

function getAllRegistry() {
  return extend({}, registries, getCustomRegistry());
}

function printErr(err) {
  console.error('an error occured: ' + err);
}

function printMsg(infos) {
  infos.forEach(function(info) {
    console.log(info);
  });
}

/*
 * print message & exit
 */
function exit(err) {
  printErr(err);
  process.exit(1);
}

function line(str, len) {
  var line = new Array(Math.max(1, len - str.length)).join('-');
  return ' ' + line + ' ';
}
