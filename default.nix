{ pkgs ? import <nixpkgs> {} }:

pkgs.stdenv.mkDerivation {
  pname = "aetherstream-gallery";
  version = "1.0.0";

  # Include the files in the directory as source
  src = ./.;

  # Include mktorrent as a build dependency
  nativeBuildInputs = [ pkgs.mktorrent ];

  # Build phase: generate .torrent files for each subdirectory and compile galleries.json
  buildPhase = ''
    echo "Creating torrent directories..."
    mkdir -p torrents
    rm -rf torrents/*

    echo "[" > torrents/galleries.json
    first=1

    # Loop through subfolders in gallery-media to build individual torrents
    for dir in gallery-media/*; do
      if [ -d "$dir" -o -L "$dir" ]; then
        name=$(basename "$dir")
        echo "Processing gallery: $name..."
        
        # Compile torrent for this subdirectory
        mktorrent -v \
          -a wss://tracker.openwebtorrent.com,wss://tracker.btorrent.xyz \
          -o torrents/"$name".torrent \
          gallery-media/"$name"

        # Append to manifest JSON
        if [ $first -eq 0 ]; then
          echo "," >> torrents/galleries.json
        fi
        echo "  { \"name\": \"$name\", \"file\": \"torrents/$name.torrent\" }" >> torrents/galleries.json
        first=0
      fi
    done

    echo "]" >> torrents/galleries.json
    echo "Compiled galleries manifest."
  '';

  # Install phase: bundle the client html and torrents directory for deployment
  installPhase = ''
    mkdir -p $out
    cp index.html $out/index.html
    cp -r torrents $out/
    
    echo "Build completed. Artifacts are placed in $out."
  '';
}
