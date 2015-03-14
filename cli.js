#!/usr/bin/env node

var path    = require('path');
var child   = require('child_process');

var fs      = require('fs-extra');
var args    = require('yargs').argv;
var _       = require('lodash');
var tracer  = require('tracer');

var Q       = require('q');

var checkDependencies = require('check-dependencies');

Q.longStackSupport = true;

var logger = tracer.colorConsole({
  format: '[{{timestamp}}] {{message}}'
});

function fileExistsSync(d) {
  try { 
    fs.lstatSync(d); 
    return true; 
  } catch (er) { 
    return false; 
  }
}

var command = function (root, command) {
  var cmd = command.slice(0);
  logger.debug('%s > %s', root, command.join(' '));
  var deferred = Q.defer();
  child.spawn(cmd.shift(), cmd, { cwd: root, stdio: 'inherit' })
    .on('exit', function (code) {
      if(code !== 0) {
        deferred.reject({root: root, command: command.join(' '), code: code});
      } else {
        deferred.resolve();
      }
    });

  return deferred.promise;
};

var collectLinks = function (root) {
  return _(_(require(path.resolve(root, 'package.json')))
    .pick(['dependencies', 'devDependencies'])
    .reduce(function (all, deps) {
      return _.merge(all, deps);
    }, {}))
    .pick(function (version, pkg) {
      return (version.charAt(0) === '.' || version.indexOf("file:") === 0) && version.indexOf('/') !== -1;
    }).mapValues(function (packagePath) {
      if(packagePath.indexOf('file:') === 0)
        packagePath = packagePath.substring(5);

      return path.resolve(root, packagePath);
    }).value();
};

var linkAndInstall = function (root) {

  return Q.all(
    _.map(collectLinks(root), function (origin, moduleName) {
      var target = path.resolve(root, 'node_modules', moduleName);

      return Q.nfcall(fs.ensureDir, path.resolve(target, '..'))
        .then(function () {
          if(fileExistsSync(target)) {
            logger.debug('%s > %s exists, removing', root, target);
            return Q.nfcall(fs.remove, target);
          } else {
            logger.trace('%s > %s doesn\' exist', root, target);
          }
        })
        .then(function () {
          logger.debug('%s > symlink %s -> %s', root, origin, target);
          return Q.nfcall(fs.symlink, origin, target);
        });
    })).then(function () {
      return command(root, ['npm', 'install']);
    });
};


Q.all(_.map(args._, function (dir) {
  var root = path.resolve(dir);
  logger.info('%s > linking & installing', root);

  return Q(checkDependencies({packageDir: root}))
    .then(function (result) {
      if(result.depsWereOk) { 
        logger.debug("%s > dependencies were already satisfied", root);
      } else {
        return linkAndInstall(root);
      }
    }).then(function () {
      logger.info('%s > complete', root);
    });
})).fail(function (err) {
  logger.error(err.stack ? err.stack : err);
  process.exit(1);
});