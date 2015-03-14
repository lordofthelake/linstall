# linstall

A command line utility that allows you to link local dependencies listed in your `package.json` file and install the rest through `npm install`. It directly creates symlinks between directories (no `npm link`), so root privileges are not required.

It has been thought as a simpler and more efficient alternative to [aperture](https://github.com/requireio/aperture), using npm 2+ [local paths syntax](https://docs.npmjs.com/files/package.json#local-paths) for dependencies.

It runs all the commands at the maximum possible concurrency, so it should be reasonably fast – at least, as fast as the slowest `npm install` command. 

It tries to minimize the work across executions checking if dependencies are already satisfied for each module before running the install process.

## Usage

```shell
$ linstall <module_dir>[ <module_dir>[ <module_dir> ...]]
```

### Example

Supposing that we have a directory structure like this:

```
~/
  modules/
    module-a/
      package.json
      ...
    module-b/
      package.json
      ...
```

And `module-b`'s `package.json` file looks like this:

```javascript
// module-a
{
  // ...
  "dependencies": {
    "gulp": "*"
  }
}

// module-b
{
  // ...
  "dependencies": {
    "module-a": "file:../module-b",
    "lodash": "*"
  }
}
```

Running `linstall ~/modules/*` will result in:

1. A symlink in `~/modules/module-b/node_modules/module-a` pointing to `~/modules/module-a`
2. `npm install` run in both `~/modules/module-a` and in `~/modules/module-b`, installing the rest of the dependencies

## License

The MIT License (MIT)

Copyright (c) 2015 Michele Piccirillo

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
