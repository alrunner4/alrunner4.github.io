{ pkgs ? import <nixpkgs> {} }:

pkgs.stdenv.mkDerivation {
  pname = "aetherstream-gallery";
  version = "1.0.0";

  # Include the files in the directory as source
  src = ./.;

  # Include mktorrent as a build dependency
  nativeBuildInputs = [ pkgs.mktorrent ];

  # Build phase: generate the .torrent file from gallery-media folder
  buildPhase = ''
    echo "Creating torrent from gallery-media folder..."
    
    # We specify WebTorrent WebRTC trackers using -a
    # -a: wss://tracker.openwebtorrent.com
    # -a: wss://tracker.btorrent.xyz
    # We also embed the GitHub Pages production URL as a Web Seed using -w
    # Remove existing torrent file in the build tree if it exists to prevent mktorrent from failing
    rm -f gallery.torrent

    mktorrent -v \
      -a wss://tracker.openwebtorrent.com,wss://tracker.btorrent.xyz \
      -o gallery.torrent \
      gallery-media
  '';

  # Install phase: bundle the client html and torrent file for deployment
  installPhase = ''
    mkdir -p $out
    cp index.html $out/index.html
    cp gallery.torrent $out/gallery.torrent
    
    echo "Build completed. Artifacts index.html and gallery.torrent are in $out."
  '';
}
