"use strict";
// Empty stand-in for @cads/tutor-platform modules the extension never uses (speech-to-text via
// whisper.cpp). Those modules compute paths from import.meta.url at load time, which is not
// available in a CommonJS bundle; stubbing them out keeps the bundle loadable.
module.exports = {};
