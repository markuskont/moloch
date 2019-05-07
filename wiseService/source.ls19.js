/* [ls19]
 * url = http://localhost:8085/ipmap
 * user = user
 * pass = pass
 */

'use strict';

var wiseSource     = require('./wiseSource.js')
  , util           = require('util')
  , HashTable      = require('hashtable')
  , request        = require('request')
  , fs             = require('fs')
  ;

//////////////////////////////////////////////////////////////////////////////////
function LockedShieldsSource (api, section) {
  LockedShieldsSource.super_.call(this, api, section);

  // Get variables needed
  this.file = api.getConfig(section, "file");
  this.url = api.getConfig(section, "url");
  this.user = api.getConfig(section, "user");
  this.pass = api.getConfig(section, "pass");
  this.auth = "Basic " + new Buffer(this.user + ":" + this.pass).toString("base64");

  // Check if variables needed are set, if not return

  // Setup any other things
  this.ips  = new HashTable();

  // There must be a better way to do this
  this.data = {};

  this.data.src = {};
  this.data.src.fullname  = this.api.addField("field:ls19.fullname.src;db:ls19.fullname_src;kind:lotermfield;friendly:Source FQDN;help:Full name of target;count:false");
  this.data.src.name      = this.api.addField("field:ls19.name.src;db:ls19.name_src;kind:lotermfield;friendly:Source Name;help:Target name without domain suffix;count:false");
  this.data.src.short     = this.api.addField("field:ls19.short.src;db:ls19.short_src;kind:lotermfield;friendly:Source Host;help:Short name of target;count:false");
  this.data.src.zone      = this.api.addField("field:ls19.zone.src;db:ls19.zone_src;kind:lotermfield;friendly:Souce Zone;help:Zone name of target;count:false");
  this.data.src.team      = this.api.addField("field:ls19.team.src;db:ls19.team_src;kind:integer;friendly:Source Team;help:Team number, 0 == !blue;count:false");
  this.data.src.bucket    = new HashTable();

  this.data.dst = {};
  this.data.dst.fullname  = this.api.addField("field:ls19.fullname.dst;db:ls19.fullname_dst;kind:lotermfield;friendly:Destination FQDN;help:Full name of target;count:false");
  this.data.dst.name      = this.api.addField("field:ls19.name.dst;db:ls19.name_dst;kind:lotermfield;friendly:Destination Name;help:Target name without domain suffix;count:false");
  this.data.dst.short     = this.api.addField("field:ls19.short.dst;db:ls19.short_dst;kind:lotermfield;friendly:Destination Host;help:Short name of target;count:false");
  this.data.dst.zone      = this.api.addField("field:ls19.zone.dst;db:ls19.zone_dst;kind:lotermfield;friendly:Destination Zone;help:Zone name of target;count:false");
  this.data.dst.team      = this.api.addField("field:ls19.team.dst;db:ls19.team_dst;kind:integer;friendly:Destination Team;help:Team number, 0 == !blue;count:false");
  this.data.dst.bucket    = new HashTable();

  this.workstation          = {};

  this.workstation.src      = {};
  this.workstation.src.template = this.api.addField("field:workstation.template.src;db:workstation.template_src;kind:integer;friendly:Source template;help:01-05, corresponding to os and arch;count:false");
  this.workstation.src.iter     = this.api.addField("field:workstation.iter.src;db:workstation.iter_src;kind:integer;friendly:Source iteration;help:cloning iteration per template;count:false");
  this.workstation.src.family   = this.api.addField("field:workstation.family.src;db:workstation.family_src;kind:lotermfield;friendly:Source OS Family;help:Linux/windoworkstation/Mac;count:false");
  this.workstation.src.release  = this.api.addField("field:workstation.release.src;db:workstation.release_src;kind:lotermfield;friendly:Source OS Release;help:10/7/Bionic/Mojave;count:false");
  this.workstation.src.arch     = this.api.addField("field:workstation.arch.src;db:workstation.arch_src;kind:lotermfield;friendly:Source OS Architecture;help:32/64;count:false");

  this.workstation.dst      = {};
  this.workstation.dst.template = this.api.addField("field:workstation.template.dst;db:workstation.template_dst;kind:integer;friendly:Destination template;help:01-05, corresponding to os and arch;count:false");
  this.workstation.dst.iter     = this.api.addField("field:workstation.iter.dst;db:workstation.iter_dst;kind:integer;friendly:Destination iteration;help:cloning iteration per template;count:false");
  this.workstation.dst.family   = this.api.addField("field:workstation.family.dst;db:workstation.family_dst;kind:lotermfield;friendly:Destination OS Family;help:Linux/windoworkstation/Mac;count:false");
  this.workstation.dst.release  = this.api.addField("field:workstation.release.dst;db:workstation.release_dst;kind:lotermfield;friendly:Destination OS Release;help:10/7/Bionic/Mojave;count:false");
  this.workstation.dst.arch     = this.api.addField("field:workstation.arch.dst;db:workstation.arch_dst;kind:lotermfield;friendly:Destination OS Architecture;help:32/64;count:false");

  // Create view that will be used in Moloch
  this.api.addView("ls19-src",
    "if (session.ls19)\n" +
    "  div.sessionDetailMeta.bold Locked Shields Source\n" +
    "  dl.sessionDetailMeta\n" +
    "    +arrayList(session.ls19, 'fullname_src', 'Source FQDN', 'ls19.fullname.src')\n" +
    "    +arrayList(session.ls19, 'name_src', 'Source name', 'ls19.name.src')\n" +
    "    +arrayList(session.ls19, 'short_src', 'Source short name', 'ls19.short.src')\n" +
    "    +arrayList(session.ls19, 'team_src', 'Source team number', 'ls19.team.src')\n" +
    "    +arrayList(session.ls19, 'zone_src', 'Source Zone', 'ls19.zone.src')\n"
  );
  this.api.addView("ls19-dst",
    "if (session.ls19)\n" +
    "  div.sessionDetailMeta.bold Locked Shields Destination\n" +
    "  dl.sessionDetailMeta\n" +
    "    +arrayList(session.ls19, 'fullname_dst', 'Destination FQDN', 'ls19.fullname.dst')\n" +
    "    +arrayList(session.ls19, 'name_dst', 'Destination name', 'ls19.name.dst')\n" +
    "    +arrayList(session.ls19, 'short_dst', 'Destination name', 'ls19.short.dst')\n" +
    "    +arrayList(session.ls19, 'team_dst', 'Destination team number', 'ls19.team.dst')\n" +
    "    +arrayList(session.ls19, 'zone_dst', 'Destination Zone', 'ls19.zone.dst')\n"
  );
  this.api.addView("ls19-workstation-src",
    "if (session.workstation)\n" +
    "  div.sessionDetailMeta.bold Workstation Source\n" +
    "  dl.sessionDetailMeta\n" +
    "    +arrayList(session.workstation, 'template_src', 'Source Template', 'workstation.template.src')\n" +
    "    +arrayList(session.workstation, 'iter_src', 'Source Iteration', 'workstation.iter.src')\n" +
    "    +arrayList(session.workstation, 'family_src', 'Source Family', 'workstation.family.src')\n" +
    "    +arrayList(session.workstation, 'release_src', 'Source Release', 'workstation.release.src')\n" +
    "    +arrayList(session.workstation, 'arch_src', 'Source Architecture', 'workstation.arch.src')\n"
  );
  this.api.addView("ls19-workstation-dst",
    "if (session.workstation)\n" +
    "  div.sessionDetailMeta.bold Workstation Destination\n" +
    "  dl.sessionDetailMeta\n" +
    "    +arrayList(session.workstation, 'template_dst', 'Destination Template', 'workstation.template.dst')\n" +
    "    +arrayList(session.workstation, 'iter_dst', 'Destination Iteration', 'workstation.iter.dst')\n" +
    "    +arrayList(session.workstation, 'family_dst', 'Destination Family', 'workstation.family.dst')\n" +
    "    +arrayList(session.workstation, 'release_dst', 'Destination Release', 'workstation.release.dst')\n" +
    "    +arrayList(session.workstation, 'arch_dst', 'Destination Architecture', 'workstation.arch.dst')\n"
  );

  // Memory data sources will have this section to load their data
  this.cacheTimeout = -1;
  if (this.file != undefined) {
    setImmediate(this.loadFile.bind(this));
  };
  if (this.url != undefined) {
    setImmediate(this.download.bind(this));
    setInterval(this.download.bind(this), 5*60*1000);
  };

  // Add the source as available
  this.api.addSource("ls19", this);
}
util.inherits(LockedShieldsSource, wiseSource);
//////////////////////////////////////////////////////////////////////////////////
LockedShieldsSource.prototype.loadFile = function() {
  var self = this;
  console.log(this.section, "- loading ", this.file);
  var body = JSON.parse(fs.readFileSync(this.file, 'utf8'));

  var count = 0;
  Object.keys(body).forEach(function(key) {
    var val = body[key];
    var srcItems = {num: 5, buffer: wiseSource.encode(
                                    self.data.src.fullname, val.full,
                                    self.data.src.name,     val.name,
                                    self.data.src.short,    val.short,
                                    self.data.src.zone,     val.zone,
                                    self.data.src.team,     val.team.toString(),
                                    )};
    var dstItems = {num: 5, buffer: wiseSource.encode(
                                    self.data.dst.fullname, val.full,
                                    self.data.dst.name,     val.name,
                                    self.data.dst.short,    val.short,
                                    self.data.dst.zone,     val.zone,
                                    self.data.dst.team,     val.team.toString(),
                                    )};

    if (val.workstation) {
      srcItems.num = srcItems.num + 5
      srcItems.buffer = Buffer.concat([srcItems.buffer, wiseSource.encode(
        self.workstation.src.template, val.workstation.template.toString(),
        self.workstation.src.iter, val.workstation.iter.toString(),
        self.workstation.src.arch, val.workstation.arch,
        self.workstation.src.family, val.workstation.family,
        self.workstation.src.release, val.workstation.release,
      )]);

      dstItems.num = dstItems.num + 5
      dstItems.buffer = Buffer.concat([dstItems.buffer, wiseSource.encode(
        self.workstation.dst.template, val.workstation.template.toString(),
        self.workstation.dst.iter, val.workstation.iter.toString(),
        self.workstation.dst.arch, val.workstation.arch,
        self.workstation.dst.family, val.workstation.family,
        self.workstation.dst.release, val.workstation.release,
      )]);
    };

    self.data.src.bucket.put(key, srcItems);
    self.data.dst.bucket.put(key, dstItems);

    count++;
  });
  console.log(self.section, "- Done loading LS19 JSON. ", count, " inserted or updated.");

};
//////////////////////////////////////////////////////////////////////////////////
LockedShieldsSource.prototype.download = function() {
  var self = this;
  console.log(this.section, "- Downloading LS19 JSON");

  //this.ips.clear();
  var options = {
    url: this.url,
    method: 'GET',
    json: true,
    headers: {
      Authorization: this.auth
    }
  };
  var count = 0;
  var req = request(
    options, function(err, resp, body) {
      if (err || resp.statusCode != 200 || body === undefined) {
        console.log(self.section, "- Error for request:\n", options, "\n", resp, "\nresults:\n", body);
        return;
      } else {
        Object.keys(body).forEach(function(key) {
          var val = body[key];
          var srcItems = {num: 5, buffer: wiseSource.encode(
                                          self.data.src.fullname, val.full,
                                          self.data.src.name,     val.name,
                                          self.data.src.short,    val.short,
                                          self.data.src.zone,     val.zone,
                                          self.data.src.team,     val.team.toString(),
                                          )};
          var dstItems = {num: 5, buffer: wiseSource.encode(
                                          self.data.dst.fullname, val.full,
                                          self.data.dst.name,     val.name,
                                          self.data.dst.short,    val.short,
                                          self.data.dst.zone,     val.zone,
                                          self.data.dst.team,     val.team.toString(),
                                          )};

          if (val.workstation) {
            srcItems.num = srcItems.num + 5
            srcItems.buffer = Buffer.concat([srcItems.buffer, wiseSource.encode(
              self.workstation.src.template, val.workstation.template.toString(),
              self.workstation.src.iter, val.workstation.iter.toString(),
              self.workstation.src.arch, val.workstation.arch,
              self.workstation.src.family, val.workstation.family,
              self.workstation.src.release, val.workstation.release,
            )]);

            dstItems.num = dstItems.num + 5
            dstItems.buffer = Buffer.concat([dstItems.buffer, wiseSource.encode(
              self.workstation.dst.template, val.workstation.template.toString(),
              self.workstation.dst.iter, val.workstation.iter.toString(),
              self.workstation.dst.arch, val.workstation.arch,
              self.workstation.dst.family, val.workstation.family,
              self.workstation.dst.release, val.workstation.release,
            )]);
          };

          self.data.src.bucket.put(key, srcItems);
          self.data.dst.bucket.put(key, dstItems);

          count++;
        });
        console.log(self.section, "- Done loading LS19 JSON. ", count, " inserted or updated.");
      };
    });
};
//////////////////////////////////////////////////////////////////////////////////
// Implement if ip lookups are supported
/*
LockedShieldsSource.prototype.getIp = function(ip, cb) {
  cb(null, this.data.src.bucket.get(ip));
};
*/
//////////////////////////////////////////////////////////////////////////////////
LockedShieldsSource.prototype.getTuple = function(tuple, cb) {
  var bites = tuple.split(";");
  var src = bites[2];
  var dst = bites[4];
  var hasSource = this.data.src.bucket.has(src);
  var hasDest = this.data.dst.bucket.has(dst);

  if (!hasSource && !hasDest) {
    return cb(null, wiseSource.emptyResult);
  }

  var out = {num: 0, buffer: new Buffer(0)};
  if (hasSource) {
    var srcInfo = this.data.src.bucket.get(src);
    out.num = out.num + srcInfo.num;
    out.buffer = Buffer.concat([out.buffer, srcInfo.buffer]);
  };
  if (hasDest) {
    var destInfo = this.data.dst.bucket.get(dst);
    out.num = out.num + destInfo.num;
    out.buffer = Buffer.concat([out.buffer, destInfo.buffer]);
  }
  return cb(null, out);
};
//////////////////////////////////////////////////////////////////////////////////
// Function called by WISE when file loaded
exports.initSource = function(api) {
  var source = new LockedShieldsSource(api, "ls19");
};
