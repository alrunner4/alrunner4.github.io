resume.pdf: resume.html
	nix-shell -p wkhtmltopdf --run 'wkhtmltopdf --margin-bottom 10mm --page-size letter $< $@'

resume-chromium.pdf: resume.html
	nix-shell -p chromium --run "chromium \
		--headless=new \
		--in-process-gpu \
		--run-all-compositor-stages-before-draw \
		--no-pdf-header-footer \
		--print-to-pdf=$@ $<"

resume-latex.pdf: resume.html
	nix-shell -p pandoc -p texlive.combined.scheme-full --run "pandoc $< -o $@"

resume-htmldoc.pdf: resume.html
	nix-shell -p htmldoc --run 'htmldoc $< -f $@'

# Gallery Build Targets
.PHONY: build-gallery clean-gallery serve

build-gallery:
	nix-build
	cp -f result/gallery.torrent ./
	rm -f result
	@echo "Build successful! Created gallery.torrent from gallery-media."

clean-gallery:
	rm -f gallery.torrent
	rm -f result

serve:
	@echo "Starting local HTTP development server at http://localhost:8000"
	@echo "Press Ctrl+C to stop."
	nix-shell -p python3 --run "python3 -m http.server 8000"
