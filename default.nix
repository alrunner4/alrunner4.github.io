{ system ? builtins.currentSystem
, pkgs ? import <nixpkgs> {} }:

derivation {
  inherit system;
  name = "alexandercarter.net";
  builder = pkgs.writeScript "site-builder" ''
    #!${pkgs.bash}/bin/bash
    mkdir $out
    ln -s ${import ./photography {inherit system pkgs;}} $out/photography
    ln -s ${./index.html} $out/index.html
    '';
  PATH = "${pkgs.coreutils}/bin";
}
