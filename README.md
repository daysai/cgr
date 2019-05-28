# cgr -- change registry | yarn & npm registry manager

[![npm](https://img.shields.io/npm/v/cgr.svg)](https://www.npmjs.com/package/cgr)

`cgr` can help you easy and fast switch between different npm or yarn or pnpm registries,
now include: `npm`, `cnpm`, `taobao`, `yarn`.

## Install

```
$ npm install -g cgr
```

## Example

```
$ cgr ls  //* for both

  npm ---- https://registry.npmjs.org/
  cnpm --- http://r.cnpmjs.org/
* taobao - https://registry.npm.taobao.org/
  yarn --- https://registry.yarnpkg.com/

```

```
$ cgr ls  //N/P for npm or pnpm, Y for yarn

N/P npm ---- https://registry.npmjs.org/
  cnpm --- http://r.cnpmjs.org/
Y taobao - https://registry.npm.taobao.org/
  yarn --- https://registry.yarnpkg.com/

```

```
$ cgr use cnpm  //both switch registry to cnpm

    npm registry has been set to: http://r.cnpmjs.org/
    yarn registry has been set to: http://r.cnpmjs.org/
    pnpm registry has been set to: http://r.cnpmjs.org/

```

```
$ cgr use cnpm y  //yarn switch registry to cnpm

    yarn registry has been set to: http://r.cnpmjs.org/

```

```
$ cgr use cnpm n  //npm switch registry to cnpm

    npm registry has been set to: http://r.cnpmjs.org/

```

```
$ cgr use cnpm p  //pnpm switch registry to cnpm

    pnpm registry has been set to: http://r.cnpmjs.org/

```

::: warning
execute `cgr use cnpm p` will cover npm registry
execute `cgr use cnpm n` will cover pnpm registry
:::

## Usage

```
Usage: cgr [options] [command]

  Commands:

    ls                           List all the registries
    use <registry> [type]        Change registry to registry
    add <registry> <url> [home]  Add one custom registry
    del <registry>               Delete one custom registry
    test [registry]              Show the response time for one or all registries
    help                         Print this help

  Options:

    -h, --help     output usage information
    -V, --version  output the version number
```

## Registries

- [npm](https://www.npmjs.org)
- [cnpm](http://cnpmjs.org)
- [taobao](http://npm.taobao.org)
- [yarn](https://yarnpkg.com)

## Notice

When you use an other registry, you can not use the `publish` command.

## LICENSE

MIT
