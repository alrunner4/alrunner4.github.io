resume.pdf: resume.html
	nix-shell -p wkhtmltopdf --run 'wkhtmltopdf --page-size letter resume.html resume.pdf'
