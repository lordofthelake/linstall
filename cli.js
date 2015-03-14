#!/usr/bin/env node

var path    = require('path');
var child   = require('child_process');

var args    = require('yargs').argv;
var _       = require('lodash');
var tracer  = require('tracer');

var Q       = require('q');
var mkdirp  = require('mkdirp');

var checkDependencies = require('check-dependencies');

var logger = tracer.colorConsole({
  format: '[{{timestamp}}] {{message}}'
});

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

var npmInstall = function (root) {
  return command(root, ['npm', 'install']);
};

var ensureDir = function (root, dir) {
  var deferred = Q.defer();
  logger.info('%s > mkdir -p %s', root, path.resolve(dir, '..'));
  mkdirp(path.resolve(dir, '..'), function (err) {
    if(err)
      deferred.reject(err);
    else
      deferred.resolve();
  });

  return deferred.promise;
};

var lnS = function (root, base, target) {
  return command(root, ['ln', '-s', base, target]);
};

var makeLink = function (root, base, target) {
  return ensureDir(root, target).then(function () {
    return lnS(root, base, target);
  });
};

var linkAll = function (root, packageMapping) {
  return Q.all(_.map(packageMapping, function (absoluteDir, pkg) {
    return makeLink(root, absoluteDir, path.resolve(root, 'node_modules', pkg));
  }));
};

var linkAndInstall = function (root) {
  return linkAll(root, collectLinks(root))
    .then(function () {
      return npmInstall(root);
    });
};

Q.all(_.map(args._, function (dir) {
  var root = path.resolve(dir);
  logger.info('%s > linking & installing', root);

  return Q(checkDependencies({packageDir: root}))
    .then(function (result) {
      if(result.depsWereOk) { 
        logger.info("%s > dependencies satisfied", root);
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