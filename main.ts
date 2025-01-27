import { TFile, CachedMetadata, Plugin } from "obsidian";

interface ImplicitTagsPluginSettings {
  itags: Record<string, any>[];
}

const DEFAULT_SETTINGS: ImplicitTagsPluginSettings = {
  itags: []
};

export default class ImplicitTagsPlugin extends Plugin {
	settings: ImplicitTagsPluginSettings;
	onMetadataCacheChangedHandler = this.updateImplicitTags.bind(this);

    async loadSettings() {
      // Load and parse JSON settings
      const loadedData = await this.loadData();
      this.settings = {
          ...DEFAULT_SETTINGS,
          itags: loadedData.itags 
      };
    }

    async saveSettings() {
      // Stringify JSON before saving
      await this.saveData({
          ...this.settings,
          itags: JSON.stringify(this.settings.itags)
      });
	}

	findPath(data: Record<string, any>[], targetName: string, path: string[] = []): string[] {
		for (const item of data) {
		  if (item.name === targetName) {
			return path; // Found the target, return the path
		  }
	  
		  // If the current item has children, search recursively
		  if (item.children) {
			const result = this.findPath(item.children, targetName, [...path, item.name]);
			if (result.length > 0) return result; // Return the path if found in children
		  }
		}
	  
		return []; // Target not found
	}

	updateImplicitTags(path: TFile, data: string, cache: CachedMetadata) {
		//this.app.metadataCache.off("changed", this.onMetadataCacheChangedHandler)
		
		console.log("----------------")
		console.log("Metadata changed");
		// In data.json we assue the following JSON:
		//
		// {
		//   "itags": [
		//     {
		//       "name": "work",
		//       "children": [
		//         {
		//           "name": "projectA", 
		//           "children": [
		//             { "name": "subprojectX" },
		//             { "name": "subprojectY", children: [
		//						{ name: "subsubAlpha" },
		//						{ name: "subsubBeta" }
		// 					]
		// 				},
		//           ]
		//         }
		//       ]
		//     }
		//   ]
		// }
		const itags_list: Record<string,any>[] = this.settings.itags;

		console.log("Implicit tags from data.json:")
		console.log(itags_list);

		// Read tags as an array
		let cached_tags: string[]
		if(typeof cache.frontmatter?.tags == 'string') {
			// Multiple tags as string, comma-separated
			if(cache.frontmatter?.tags.includes(",")) {
				cached_tags = cache.frontmatter?.tags.split(",");
			// Single tag as string
			} else {
				cached_tags = [cache.frontmatter?.tags];
			}
		// Tags as array or empty array
		} else {
			// If there are itags, cache.cached.tags also includes those!
			cached_tags = cache.frontmatter?.tags || [];
		}

		console.log("Cached tags (thesse include tags and itags!):");
		console.log(cached_tags);

		// Get all inline tags  
		let inline_tags = cache.tags?.map((t) => {
			// inline tags are written as #tag, while frontmatter tags are written as tag (without #)
			let tag = t.tag.substring(1)
			if (!(cache.frontmatter?.itags || []).includes(tag)) return tag 
		}) || [];

		// Create one array with all explicit tags (written as 'tag')
		let file_tags = [...cached_tags, ...inline_tags];

		console.log("File tags:");
		console.log(file_tags);

		// Filter unique items
		let explicit_tags = file_tags.filter((value, index, array) => array.indexOf(value) === index);

		let implicit_tags_found: string[] = [];
		// Loop through all unique explicit tags found in file (frontmatter and inline)
		explicit_tags.forEach((tag: string) => {
			console.log("Checking explicit tag for implicit matches")
			console.log(tag)

			let result = this.findPath(itags_list, tag);

			console.log("Result:")
			console.log(result);

			implicit_tags_found = [...implicit_tags_found, ...result];
		});

		// Filter implicit tags found to unique values
		implicit_tags_found = implicit_tags_found.filter((value, index, array) => array.indexOf(value) === index) || [];

		console.log("Implicit tags in data.json via explicit tags in file");
		console.log(implicit_tags_found);

		// Get the new frontmatter tags without the implicit tags
		let new_frontmatter_tags: string[] = cached_tags?.filter((value, index) => implicit_tags_found.indexOf(value) < 0) || [];

		console.log("New frontmatter tags:")
		console.log(new_frontmatter_tags)

		// Build the array with implicit tags by removing the new frontmatter tags from the implicit tags found
		let new_implicit_tags: string[] = implicit_tags_found?.filter((item) => new_frontmatter_tags?.indexOf(item) < 0);

		console.log("New implicit tags:")
		console.log(new_implicit_tags);


		// Update frontmatter tags
		this.app.fileManager.processFrontMatter(path, (frontmatter) => {
			console.log(frontmatter);
			// Set frontmatter tags
			if (new_frontmatter_tags.length > 0) {
				frontmatter.tags = new_frontmatter_tags.sort();
			} else {
				frontmatter.tags = [];
			}

			// Set implicit tags
			if (new_implicit_tags.length > 0) {
				for (var prop in frontmatter) {
					if (frontmatter.hasOwnProperty(prop)) {
						// FIXME: ugly hack to ensure itags field is inserted directly after tags field
						// by removing frontmatter field and recreating it so it is in the right order
						let value = frontmatter[prop];
						delete frontmatter[prop];
						frontmatter[prop]= value;

						// Insert itags field directly after tags field
						prop == "tags" ? frontmatter['itags'] = new_implicit_tags.sort() : null;
					}
				}

				// When only itags and no tags field is present
				if(!frontmatter.hasOwnProperty("itags")) {
					frontmatter['itags'] = new_implicit_tags.sort();
				}

				if(cache.frontmatter) {
					// FIXME: why do we need to check for unique values; this should not happen... (but it does because of timeout?)
					let new_cache_tags = [...cache.frontmatter.tags, ...new_implicit_tags].filter((value, index, array) => array.indexOf(value) === index);
					//let new_cache_tags = [...cache.frontmatter?.tags, ...new_implicit_tags]

					// Update frontmatter cache
					console.log("Updating cache");
					console.log(new_cache_tags);
					cache.frontmatter.tags = new_cache_tags;
				} 
			} else {
				// If no implicit tags: make sure the remove itags field
				cache.frontmatter ? cache.frontmatter.tags = explicit_tags : [];
				delete frontmatter['itags'];
			}

		});

		// Prevent it from firing twice (ugly hack!)
		//setTimeout(() => { this.app.metadataCache.on("changed", this.onMetadataCacheChangedHandler); }, 500);
	}

	async onload() {
    	await this.loadSettings();
	    this.registerEvent(this.app.metadataCache.on("changed", this.onMetadataCacheChangedHandler));
	}
}