
JS_FILES := $(wildcard js/*.js) $(wildcard js/*/*.js) $(wildcard js/*/*/*.js)


LEVEL_SRC_PATH := source/leveldata.ts
LEVEL_FOLDER := levels
mapconv := ./scripts/mapconv.py



all: js

.PHONY: js
js:
	tsc

.PHONY: watch
watch:
	tsc -w

.PHONY: server
server:
	python3 -m http.server


.PHONY: levels
levels:
	echo -n "export const LEVEL_DATA : string[] = [\n" > $(LEVEL_SRC_PATH)
	$(mapconv) $(LEVEL_FOLDER)/1.tmx >> $(LEVEL_SRC_PATH)
	echo -n "]" >> $(LEVEL_SRC_PATH)



######################


.PHONY: closure
closure:
	rm -rf ./temp
	mkdir -p temp
	java -jar $(CLOSURE_PATH) --js $(JS_FILES) --js_output_file temp/out.js --compilation_level ADVANCED_OPTIMIZATIONS --language_out ECMASCRIPT_2020


compress: js closure


.PHONY: pack
pack:
	mkdir -p temp
	cp templates/index.html temp/index.html
	cp f.png temp/f.png
	cp b.png temp/b.png

.PHONY: zip
zip: 
	(cd temp; zip -r ../dist.zip .)
	advzip -z dist.zip
	wc -c dist.zip

.PHONY: clear_temp
clear_temp:
	rm -rf ./temp 


.PHONY: dist 
dist: compress pack zip clear_temp
