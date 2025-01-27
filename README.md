# Obsidian Implicit Tags plugin 
Prevent nested tags by using a hardcoded tag structure

## ⚠️i DANGER ⚠️

This plugin is not made for daily use yet, so you’ll have to adapt it to your own
needs manually. It might destroy your vault or burn down your house. Use with care.
It’s using an undocumented feature to update the metadata cache so things may break 
in the future!

## Installation
- Add a property field `itags` to your vault (e.g. by adding it to one of your files)
- Update `types.json` in your `.obsidian` diretory to change the type of the field `itags` to `tags`
- Clone repository to your local `.obsidian/plugins` directory
- Change `data.json.example` to `data.json`
- Run locally (e.g. via `npm run dev`) to compile

See this [Obsidian Forum thread](https://forum.obsidian.md/t/add-a-property-type-for-tags-multiple-tag-based-properties) for more background

## Background

To clarify a bit: I’m using this plugin to prevent sub-tags, e.g. instead of
`projectA/subprojectA1` I tag my document with `subprojectA1` and it automatically
updates the an `itags` field with projectA which is also removed if I remove the
subprojectA1 tag.

## Ideas

This plugin can be expanded / changed to add more field of type tags to your
vault and treat everything in that field as a tag. The trick is that the
`cache.frontmatter.tags` property should be kept in sync with those tags so Obsidian will
think they are actually tags (although they don’t appear as such in the file)

E.g. you could create a field `status` and change the type to `tags` in `types.json` to treat
everything in that field as a tag. You would have to keep the metadata cache in Obsidian
updated via the `cache.frontmatter.tags` attribute (or if you have a smarter idea to do this:
[let me know](mailto:m@mdbraber.com)! 
