# Contributing

If you have any questions about [properties-store](https://github.com/NotNinja/properties-store) please feel free to
[raise an issue](https://github.com/NotNinja/properties-store/issues/new).

Please [search existing issues](https://github.com/NotNinja/properties-store/issues) for the same feature and/or issue
before raising a new issue. Commenting on an existing issue is usually preferred over raising duplicate issues.

Please ensure that all files conform to the coding standards, using the same coding style as the rest of the code base.
All unit tests should be updated and passing as well. All of this can easily be checked via command-line:

``` bash
# install/update package dependencies
$ npm install
# run test suite
$ npm test
```

You must have at least [Node.js](https://nodejs.org) version 8 or newer installed.

All pull requests should be made to the `develop` branch.

Don't forget to add your details to the list of
[AUTHORS.md](https://github.com/NotNinja/properties-store/blob/master/AUTHORS.md) if you want your contribution to be
recognized by others.

## Documentation

The website is hosted on GitHub at the following address:

https://notninja.github.io/properties-store

The homepage is built from [README.md](https://github.com/NotNinja/properties-store/blob/master/README.md), however,
the [documentation](https://notninja.github.io/properties-store/docs) is built from source as part of the release
process by a maintainer. These steps are not required by contributors when opening pull requests etc. In fact, it's
discouraged in favour of cleaner pull requests.

The following command will re-generate the documentation:

``` bash
# generate documentation
$ npm run doc
```

The following is required to run the website locally:

* [Ruby](https://www.ruby-lang.org/en) 2+
* [Bundler](http://bundler.io)

Then you need to install the dependencies before finally serving the website:

``` bash
# install website dependencies
$ bundle install
# serve website
$ bundle exec jekyll serve
```

You can find the port on which the website is being served within the output of the last command (e.g.
`Server address: http://127.0.0.1:4000/`).

Once merged into the `master` branch, the public website will automatically be updated.
