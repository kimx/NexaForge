# Emoji data updates

The Emoji Picker dataset is generated from pinned official sources:

- Unicode Emoji 17.0 `emoji-test.txt` under Unicode 17.0.0
- CLDR annotations and derived annotations from the `release-48` tag for `en` and `zh_Hant`

Run `npm run generate:emoji-data` manually when intentionally updating the dataset. The command needs network access and overwrites `src/data/emoji.generated.ts`. Normal tests, builds, prerendering, and the deployed tool use the committed module and make no data requests.

Before committing an update, review the source version constants and URLs, confirm that only `fully-qualified` entries were emitted, confirm ids are unique, run the focused generator and emoji-service tests, then run the full build. Unicode data and CLDR are used under the [Unicode Terms of Use](https://www.unicode.org/terms_of_use.html).
