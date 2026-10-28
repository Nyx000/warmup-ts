# Plugins

A plugin is one piece of behaviour: an object with a `name` and the engine hooks it needs (see `src/core/plugin.ts`). Plugins here are shared by more than one gamemode; a plugin only one gamemode uses stays in that gamemode's folder.

Each plugin sits in one category, by what it touches. If it seems to fit two, it is probably two plugins. A category with ten or more files gets subfolders. Tests sit next to the file they test.
