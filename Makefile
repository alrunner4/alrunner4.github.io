
resume.pdf: resume.html
	nix run 'nixpkgs#html-tidy' -- -quiet -output /dev/null resume.html
	nix run 'nixpkgs#chromium' -- --headless --print-to-pdf-no-header --print-to-pdf=resume.pdf resume.html
