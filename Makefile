resume.pdf: resume.html
	nix-shell -p wkhtmltopdf --run 'wkhtmltopdf --margin-bottom 10mm --page-size letter resume.html $@'

resume-latex.pdf: resume.html
	nix-shell -p pandoc -p texlive.combined.scheme-full --run "pandoc resume.html -o $@"

resume-htmldoc.pdf: resume.html
	nix-shell -p htmldoc --run 'htmldoc resume.html -f $@'
