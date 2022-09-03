#!/usr/bin/env node

const os = require('os');
const path = require('path');
const fs = require('fs');
const program = require('commander');
const ini = require('ini');
const extend = require('extend');
const async = require('async');
const request = require('request');
const exec = require('child_process').exec;
const registries = require('./registries.json');
const PKG = require('./package.json');
const HOME = os.homedir();
const CGRRC = path.join(HOME, '.cgrrc');
const CGRCF = path.join(HOME, '.cgrcf');

const npmRe = {
  get: 'npm config get registry',
  set: 'npm config set registry'
};
const yarnRe = {
  get: 'yarn config get registry',
  set: 'yarn config set registry'
};
const pnpmRe = {
  get: 'pnpm config get registry',
  set: 'pnpm config set registry'
};
const typeArrTip = ['N', 'Y', 'P'];

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
  .command('on [type]')
  .description('Enable pnpm or other type')
  .action(onEnable);

program
  .command('off [type]')
  .description('Disable pnpm or other type')
  .action(onDisable);

program
  .command('help')
  .description('Print this help')
  .action(function () {
    program.outputHelp();
  });

program.parse(process.argv);

if (process.argv.length === 2) {
  program.outputHelp();
}

/*//////////////// cmd methods /////////////////*/

function onList() {
  getCurrentRegistry(function (curArr) {
    const info = [''],
      allRegistries = getAllRegistry();

    Object.keys(allRegistries).forEach(function (key) {
      const item = allRegistries[key],
        registry = String(item.registry),
        prefixIndex = curArr.indexOf(registry),
        curRegistryArr = curArr.filter(function(key) {
          return key === registry;
        }),
        prefix =
          prefixIndex === -1
            ? '  '
            : `${curRegistryArr.length > 1 ? '*' : typeArrTip[prefixIndex]} `;
      info.push(`${prefix}${key}${line(key, 8)}${registry}`);
    });

    info.push('');
    printMsg(info);
  });
}

function showCurrent() {
  getCurrentRegistry(function (curArr) {
    const info = [''],
      allRegistries = getAllRegistry();

    Object.keys(allRegistries).forEach(function (key) {
      const item = allRegistries[key],
        registry = String(item.registry),
        prefixIndex = curArr.indexOf(registry),
        curRegistryArr = curArr.filter(function(key) {
          return key === registry;
        });
      if (prefixIndex !== -1) {
        const prefix = `${curRegistryArr.length > 1 ? '*' : typeArrTip[prefixIndex]} `;
        info.push(`${prefix}${key}${line(key, 8)}${registry}`);
      }
    });

    info.push('');
    printMsg(info);
  });
}

function onUse(name, type) {
  const allRegistries = getAllRegistry();
  const pnpmEnable = checkPnpm();
  if (allRegistries.hasOwnProperty(name)) {
    const registry = allRegistries[name],
      info = [''],
      registrySet = 'registry has been set to:';
    if (!type) {
      exec(`${npmRe.set} ${registry.registry}`, function (errN, stdoutN, stderrN) {
        exec(`${yarnRe.set} ${registry.registry}`, function (errY, stdoutY, stderrY) {
          if (errN && errY) return exit([stderrN, stderrY]);

          if (pnpmEnable) {
            exec(`${pnpmRe.set} ${registry.registry}`, function (errP, stdoutP, stderrP) {
              info.push(errN ? stderrN : `   npm ${registrySet} ${registry.registry}`);
              info.push(errY ? stderrY : `   yarn ${registrySet} ${registry.registry}`);
              info.push(errP ? stderrP : `   pnpm ${registrySet} ${registry.registry}`);
              info.push('');
              printMsg(info);
            });
          } else {
            info.push(errN ? stderrN : `   npm ${registrySet} ${registry.registry}`);
            info.push(errY ? stderrY : `   yarn ${registrySet} ${registry.registry}`);
            info.push('');
            printMsg(info);
          }
        });
      });
    } else {
      const smType = type.toLowerCase();
      if (smType === 'npm' || smType === 'n') {
        exec(`${npmRe.set} ${registry.registry}`, function (err, stdout, stderr) {
          if (err) return exit([stderr]);
          info.push(`   npm ${registrySet} ${registry.registry}`);
          info.push('');
          printMsg(info);
        });
      } else if (smType === 'yarn' || smType === 'y') {
        exec(`${yarnRe.set} ${registry.registry}`, function (err, stdout, stderr) {
          if (err) return exit([stderr]);
          info.push(`   yarn ${registrySet} ${registry.registry}`);
          info.push('');
          printMsg(info);
        });
      } else if (smType === 'pnpm' || smType === 'p') {
        if (pnpmEnable) {
          exec(`${pnpmRe.set} ${registry.registry}`, function (err, stdout, stderr) {
            if (err) return exit([stderr]);
            info.push(`   pnpm ${registrySet} ${registry.registry}`);
            info.push('');
            printMsg(info);
          });
        } else {
          info.push('   cgr pnpm disabled, enable pnpm:');
          info.push('   cgr on pnpm');
          info.push('');
          printMsg(info);
        }
      } else {
        info.push('   cgr use <registry> [type]');
        info.push('   type must be oneOf yarn | y | npm | n | pnpm | p');
        info.push('');
        printMsg(info);
      }
    }
  } else {
    printMsg(['', '   Not find registry: ' + name, '']);
  }
}

function onDel(name) {
  const customRegistries = getCustomRegistry();
  if (!customRegistries.hasOwnProperty(name)) return;
  getCurrentRegistry(function (curArr) {
    if (curArr.indexOf(customRegistries[name].registry) !== -1) {
      onUse('npm');
    }
    delete customRegistries[name];
    setCustomRegistry(customRegistries, function (err) {
      if (err) return exit([err]);
      printMsg(['', '    delete registry ' + name + ' success', '']);
    });
  });
}

function onAdd(name, url, home) {
  const customRegistries = getCustomRegistry();
  if (customRegistries.hasOwnProperty(name)) return;
  const config = (customRegistries[name] = {});
  if (url[url.length - 1] !== '/') url += '/'; // ensure url end with /
  config.registry = url;
  if (home) {
    config.home = home;
  }
  setCustomRegistry(customRegistries, function (err) {
    if (err) return exit([err]);
    printMsg(['', '    add registry ' + name + ' success', '']);
  });
}

function onTest(registry) {
  var allRegistries = getAllRegistry(),
    toTest;

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
    function (name, cbk) {
      const registry = toTest[name],
        start = +new Date();
      request(registry.registry + 'pedding', function (error) {
        cbk(null, {
          name: name,
          registry: registry.registry,
          time: +new Date() - start,
          error: error ? true : false
        });
      });
    },
    function (err, results) {
      getCurrentRegistry(function (curArr) {
        const msg = [''];
        results.forEach(function (result) {
          const registry = String(result.registry),
            prefixIndex = curArr.indexOf(registry),
            curRegistryArr = curArr.filter(function(key) {
              return key === registry;
            }),
            prefix =
              prefixIndex === -1
                ? '  '
                : `${curRegistryArr.length > 1 ? '*' : typeArrTip[prefixIndex]} `,
            suffix = result.error ? 'Fetch Error' : `${result.time}ms`;
          msg.push(`${prefix}${result.name}${line(result.name, 8)}${suffix}`);
        });
        msg.push('');
        printMsg(msg);
      });
    }
  );
}

function onEnable(type) {
  const config = getConfig();
  if (config[type]) return;
  setConfig(Object.assign(config, { [type]: true }), function (err) {
    if (err) return exit([err]);
    printMsg(['', '    cgr enable ' + type + ' success', '']);
  });
}

function onDisable(type) {
  const config = getConfig();
  if (!config[type]) return;
  delete config[type];
  setConfig(config, function (err) {
    if (err) return exit([err]);
    printMsg(['', '    cgr disable ' + type + ' success', '']);
  });
};

/*//////////////// helper methods /////////////////*/

/*
 * get current registry
 */
function getCurrentRegistry(cbk) {
  exec(npmRe.get, function (errN, stdoutN, stderrN) {
    exec(yarnRe.get, function (errY, stdoutY, stderrY) {
      if (errN && errY) return exit([stderrN, stderrY]);

      if (checkPnpm()) {
        exec(pnpmRe.get, function (errP, stdoutP, stderrP) {
          if (errN) console.log(stderrN);
          if (errY) console.log(stderrY);
          if (errP) console.log(stderrP);
          const npmRegistry = getRegistry(stdoutN.trim()),
            yarnRegistry = getRegistry(stdoutY.trim()),
            pnpmRegistry = getRegistry(stdoutP.trim());
          cbk([npmRegistry, yarnRegistry, pnpmRegistry]);
        });
      } else {
        if (errN) console.log(stderrN);
        if (errY) console.log(stderrY);
        const npmRegistry = getRegistry(stdoutN.trim()),
          yarnRegistry = getRegistry(stdoutY.trim());
        cbk([npmRegistry, yarnRegistry]);
      }
    });
  });
}

function getRegistry(registry) {
  if (registry[registry.length - 1] !== '/') {
    registry = registry + '/';
  }
  return registry;
}

function getCustomRegistry() {
  return fs.existsSync(CGRRC) ? ini.parse(fs.readFileSync(CGRRC, 'utf-8')) : {};
}

function setCustomRegistry(config, cbk) {
  fs.writeFile(CGRRC, ini.stringify(config), 'utf-8', cbk);
}

function getConfig() {
  return fs.existsSync(CGRCF) ? JSON.parse(fs.readFileSync(CGRCF, 'utf-8')) : {};
}

function setConfig(config, cbk) {
  fs.writeFile(CGRCF, JSON.stringify(config), 'utf-8', cbk);
}

function checkType(type) {
  const config = getConfig();
  return config[type];
}

function checkPnpm() {
  return checkType('pnpm');
};

function getAllRegistry() {
  return extend({}, registries, getCustomRegistry());
}

function printMsg(infos) {
  infos.forEach(function (info) {
    console.log(info);
  });
}

/*
 * print message & exit
 */
function exit(errs) {
  printMsg(errs);
  process.exit(1);
}

function line(str, len) {
  const line = new Array(Math.max(1, len - str.length)).join('-');
  return ` ${line} `;
}
