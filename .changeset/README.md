# Changesets

This project uses [changesets](https://github.com/changesets/changesets) to manage versioning and publishing.

## Adding a changeset

After making changes, run:

```bash
bunx changeset
```

This will prompt you to:
1. Select which packages changed
2. Choose the bump type (major/minor/patch)
3. Write a summary of the change

## Versioning

To bump versions based on accumulated changesets:

```bash
bunx changeset version
```

## Publishing

To publish all changed packages to npm:

```bash
bunx changeset publish
```
