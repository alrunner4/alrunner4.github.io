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
