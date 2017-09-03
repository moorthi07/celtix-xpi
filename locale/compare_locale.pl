#!/usr/bin/perl

use strict;

my $src = shift;
my $dst = shift;

die "Usage: compare_locale.pl srcdir dstdir\n" unless defined($src) and defined($dst);

open SRCDTD, "<$src/celtx.dtd" or die "File does not exist: $src/celtx.dtd\n";
open DSTDTD, "<$dst/celtx.dtd" or die "File does not exist: $dst/celtx.dtd\n";

my %dtds;

while (my $line = <SRCDTD>) {
  if (my ($dtd) = $line =~ /<!ENTITY\s+(\S+)/) {
    chomp $dtd;
    $dtds{$dtd} = 0;
  }
}

close SRCDTD;

while (my $line = <DSTDTD>) {
  if (my ($dtd) = $line =~ /<!ENTITY\s+(\S+)/) {
    chomp $dtd;
    $dtds{$dtd} = 1;
  }
}

close DSTDTD;

my @missingdtds;

foreach my $dtd (sort keys %dtds) {
  push @missingdtds, $dtd if $dtds{$dtd} == 0;
}

if (@missingdtds) {
  print "Missing DTDs:\n";
  foreach my $dtd (@missingdtds) { print "\t$dtd\n"; }
} else {
  print "No missing DTDs.\n";
}

open SRCPROP, "<$src/celtx.properties" or die "File not found: $src/celtx.properties\n";
open DSTPROP, "<$dst/celtx.properties" or die "File not found: $dst/celtx.properties\n";

my %props;

while (my $line = <SRCPROP>) {
  if (my ($prop) = $line =~ /^([^=]+)=/) {
    chomp $prop;
    $props{$prop} = 0;
  }
}

close SRCPROP;

while (my $line = <DSTPROP>) {
  if (my ($prop) = $line =~ /^([^=]+)=/) {
    chomp $prop;
    $props{$prop} = 1;
  }
}

close DSTPROP;

my @missingprops;

foreach my $prop (sort keys %props) {
  push @missingprops, $prop if $props{$prop} == 0;
}

if (@missingprops) {
  print "Missing properties:\n";
  foreach my $prop (@missingprops) { print "\t$prop\n"; }
} else {
  print "No missing properties.\n";
}

