/* [bloom]
 * bits=200000
 * functions=16
 * tag=newdns
 */

'use strict';

var wiseSource     = require('./wiseSource.js')
  , util           = require('util')
  , bloom    = require('bloomfilter')
  ;

//////////////////////////////////////////////////////////////////////////////////
function BloomSource (api, section) {
  BloomSource.super_.call(this, api, section);

  this.bits = api.getConfig(section, "bits");
  this.fn = api.getConfig(section, "functions");
  this.tagval = api.getConfig(section, "tag");

  if (this.bits === undefined || this.fn === undefined || this.tagval === undefined) {
    return console.log(this.section, "- missing config options");
  }

  this.dns = new bloom.BloomFilter(
    this.bits, // number of bits to allocate.
    this.fn    // number of hash functions.
  );

  this.tagsField = this.api.addField("field:tags");

  // Memory data sources will have this section to load their data
  this.cacheTimeout = -1;
  //setImmediate(this.load.bind(this));
  //setInterval(this.load.bind(this), 5*60*1000);

  // Add the source as available
  this.api.addSource("bloom", this);
}
util.inherits(BloomSource, wiseSource);
//////////////////////////////////////////////////////////////////////////////////
BloomSource.prototype.getDomain = function(domain, cb) {
  if (!this.bloom.test(domain)) {
    this.bloom.add(domain);
    return cb(null, {num: 1, buffer: wiseSource.encode(this.tagsField, this.tagval)});
  }
  return cb(null, wiseSource.emptyResult);
};
//////////////////////////////////////////////////////////////////////////////////
exports.initSource = function(api) {
  var source = new BloomSource(api, "bloom");
};

