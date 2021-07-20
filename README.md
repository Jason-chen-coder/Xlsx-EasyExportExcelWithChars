# Vue项目中导出Excel表格并带上图表

## 1.需求场景:

我们在开发过程中会遇到一些需求就是将表格中的数据导出到excel文件中并下载至本地,但目前基本上下载的excel文件只有简单的表格数据,没有相关的图表(如饼图,柱状图等),当我们excel文件中带上了这些图表,可以帮助用户更加简洁明了地看到数据间的关系;

## 2.使用工具:

xslx-chart插件，由于xslx-chart是一个node环境下的一个插件所以我们可以使用两种方法来使用它,下文就如何使用xslx-cahrt进行介绍(着重介绍方法二)

## 3.开始使用:

**方法一**:基于node环境使用xslx-chart工具;
注意:
	由于xslx-chart是在nodejs环境下运行的,所以我们要在项目本地跑一个node服务来使用xslx-cahrt,
**思路:**

1.我们在运行项目的同时,在本地跑一个nodejs服务(xlsx-chart-serve),在该nodejs服务中处理表格的操作,处理完之后再将文件发送到前端,前端再进行文件下载;

如图:我们跑项目时直接执行
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201222092937708.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3dlaXhpbl8zOTA4NTgyMg==,size_16,color_FFFFFF,t_70)
```bash
npm run dev
```
就会同时执行serve和xlsx;xlsx作用就是将导出表格的服务跑起来;

**注意:**

同时执行多个指令需要**concurrently**这个工具,使用 && 连接两个指令是串行的,会中断执行命令

2.我们服务跑起来之后,前端需要导出表格时,将数据发送给nodejs服务,交由xlsx这个服务处理,处理完之后将文件发给前端

**注意:**
	由于node服务和我们项目自身的端口不一致,所以会导致跨域的问题,这个需要注意

**方法二(推荐)**:
	基于xlsx-chart进行二次开发,直接在前端中使用

**思路:**
 	我们看xlsx-chart工具的源码不难发现,它生成的图表是在本地读取模板文件然后再拿最新的数据去替换模板表格中的数据生成的新表格和新图表,它在node环境中使用的是fs工具读取文件,那我们可以在前端使用axios请求本地文件,只要读取文件内容和类型一致就可以了
	
 **重点:** axios请求中响应数据类型需要配置;**将responseType设置为'arraybuffer'**
 	
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201222093014191.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3dlaXhpbl8zOTA4NTgyMg==,size_16,color_FFFFFF,t_70)
然后生成的最新文件使用file-saver下载下来即可
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201222093022748.png)
修改后的源码文件如下:

**第一步:准备源码:**
base.js
```js
var _ = require("underscore");
var Backbone = require("backbone");
var JSZip = require("jszip");
var xml2js = require("xml2js");
var VError = require("verror");
var axios = require('axios');
// var fs = require ("fs");
var async = require("async");
var Chart = Backbone.Model.extend({
  /*
    Read XML file from xlsx as object
  */
  read: function (opts, cb) {
    var me = this;
    var t = me.zip.file(opts.file).asText();
    var parser = new xml2js.Parser({ explicitArray: false });
    parser.parseString(t, function (err, o) {
      if (err) {
        return new VError(err, "getXML");
      }
      cb(err, o);
    });
  },
  /*
    Build XML from object and write to zip
  */
  write: function (opts) {
    var me = this;
    var builder = new xml2js.Builder();
    var xml = builder.buildObject(opts.object);
    me.zip.file(opts.file, new Buffer(xml), { base64: true });
  },
  /*
    Get column name
  */
  getColName: function (n) {
    var abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    n--;
    if (n < 26) {
      return abc[n];
    } else {
      return abc[(n / 26 - 1) | 0] + abc[n % 26];
    }
  },
  /*
    Get shared string index
  */
  getStr: function (s) {
    var me = this;
    if (!me.str.hasOwnProperty(s)) {
      throw new VError("getStr: Unknown string: " + s);
    }
    return me.str[s];
  },
  /*
    Write table
  */
  writeTable: function (cb) {
    var me = this;
    me.read({ file: "xl/worksheets/sheet2.xml" }, function (err, o) {
      if (err) {
        return cb(new VError(err, "writeTable"));
      }
      o.worksheet.dimension.$.ref = "A1:" + me.getColName(me.titles.length + 1) + (me.fields.length + 1);
      var rows = [{
        $: {
          r: 1,
          spans: "1:" + (me.titles.length + 1)
        },
        c: _.map(me.titles, function (t, x) {
          return {
            $: {
              r: me.getColName(x + 2) + 1,
              t: "s"
            },
            v: me.getStr(t)
          }
        })
      }];
      _.each(me.fields, function (f, y) {
        var r = {
          $: {
            r: y + 2,
            spans: "1:" + (me.titles.length + 1)
          }
        };
        var c = [{
          $: {
            r: "A" + (y + 2),
            t: "s"
          },
          v: me.getStr(f)
        }];
        _.each(me.titles, function (t, x) {
          c.push({
            $: {
              r: me.getColName(x + 2) + (y + 2)
            },
            v: me.data[t][f]
          });
        });
        r.c = c;
        rows.push(r);
      });
      // table的數據
      o.worksheet.sheetData.row = rows;
      console.log('o',o,rows)
      me.write({ file: "xl/worksheets/sheet2.xml", object: o });
      cb();
    });
  },
  /*
    Write strings
  */
  writeStrings: function (cb) {
    var me = this;
    me.read({ file: "xl/sharedStrings.xml" }, function (err, o) {
      if (err) {
        return cb(new VError(err, "writeStrings"));
      }
      o.sst.$.count = me.titles.length + me.fields.length;
      o.sst.$.uniqueCount = o.sst.$.count;
      var si = [];
      _.each(me.titles, function (t) {
        si.push({ t: t });
      });
      _.each(me.fields, function (t) {
        si.push({ t: t });
      });
      me.str = {};
      _.each(si, function (o, i) {
        me.str[o.t] = i;
      });
      o.sst.si = si;
      me.write({ file: "xl/sharedStrings.xml", object: o });
      cb();
    });
  },
  /*
    Remove unused charts
  */
  removeUnusedCharts: function (o) {
    var me = this;
    if (me.tplName != "charts") {
      return;
    };
    var axId = [];
    function addId (o) {
      _.each(o["c:axId"], function (o) {
        axId.push(o.$.val);
      });
    };
    _.each(["line", "radar", "area", "scatter", "pie"], function (chart) {
      if (!me.charts[chart]) {
        delete o["c:chartSpace"]["c:chart"]["c:plotArea"]["c:" + chart + "Chart"];
      } else {
        addId(o["c:chartSpace"]["c:chart"]["c:plotArea"]["c:" + chart + "Chart"]);
      };
    });
    if (!me.charts["column"] && !me.charts["bar"]) {
      delete o["c:chartSpace"]["c:chart"]["c:plotArea"]["c:barChart"];
    } else
      if (me.charts["column"] && !me.charts["bar"]) {
        o["c:chartSpace"]["c:chart"]["c:plotArea"]["c:barChart"] = o["c:chartSpace"]["c:chart"]["c:plotArea"]["c:barChart"][0];
        addId(o["c:chartSpace"]["c:chart"]["c:plotArea"]["c:barChart"]);
      } else
        if (!me.charts["column"] && me.charts["bar"]) {
          o["c:chartSpace"]["c:chart"]["c:plotArea"]["c:barChart"] = o["c:chartSpace"]["c:chart"]["c:plotArea"]["c:barChart"][1];
          addId(o["c:chartSpace"]["c:chart"]["c:plotArea"]["c:barChart"]);
        } else {
          addId(o["c:chartSpace"]["c:chart"]["c:plotArea"]["c:barChart"][0]);
          addId(o["c:chartSpace"]["c:chart"]["c:plotArea"]["c:barChart"][1]);
        };

    var catAx = [];
    _.each(o["c:chartSpace"]["c:chart"]["c:plotArea"]["c:catAx"], function (o) {
      if (axId.indexOf(o["c:axId"].$.val) > -1) {
        catAx.push(o);
      };
    });
    o["c:chartSpace"]["c:chart"]["c:plotArea"]["c:catAx"] = catAx;

    var valAx = [];
    _.each(o["c:chartSpace"]["c:chart"]["c:plotArea"]["c:valAx"], function (o) {
      if (axId.indexOf(o["c:axId"].$.val) > -1) {
        valAx.push(o);
      };
    });
    o["c:chartSpace"]["c:chart"]["c:plotArea"]["c:valAx"] = valAx;
  },
  /*
    Write chart
  */
  writeChart: function (cb) {
    var me = this;
    var chart;
    me.read({ file: "xl/charts/chart1.xml" }, function (err, o) {
      if (err) {
        return cb(new VError(err, "writeChart"));
      }
      var ser = {};
      _.each(me.titles, function (t, i) {
        var chart = me.data[t].chart || me.chart;
        var r = {
          "c:idx": {
            $: {
              val: i
            }
          },
          "c:order": {
            $: {
              val: i
            }
          },
          "c:tx": {
            "c:strRef": {
              "c:f": "Table!$" + me.getColName(i + 2) + "$1",
              "c:strCache": {
                "c:ptCount": {
                  $: {
                    val: 1
                  }
                },
                "c:pt": {
                  $: {
                    idx: 0
                  },
                  "c:v": t
                }
              }
            }
          },
          "c:cat": {
            "c:strRef": {
              "c:f": "Table!$A$2:$A$" + (me.fields.length + 1),
              "c:strCache": {
                "c:ptCount": {
                  $: {
                    val: me.fields.length
                  }
                },
                "c:pt": _.map(me.fields, function (f, j) {
                  return {
                    $: {
                      idx: j
                    },
                    "c:v": f
                  };
                })
              }
            }
          },
          "c:val": {
            "c:numRef": {
              "c:f": "Table!$" + me.getColName(i + 2) + "$2:$" + me.getColName(i + 2) + "$" + (me.fields.length + 1),
              "c:numCache": {
                "c:formatCode": "General",
                "c:ptCount": {
                  $: {
                    val: me.fields.length
                  }
                },
                "c:pt": _.map(me.fields, function (f, j) {
                  return {
                    $: {
                      idx: j
                    },
                    "c:v": me.data[t][f]
                  };
                })
              }
            }
          }
        };
        if (chart == "scatter") {
          r["c:xVal"] = r["c:cat"];
          delete r["c:cat"];
          r["c:yVal"] = r["c:val"];
          delete r["c:val"];
          r["c:spPr"] = {
            "a:ln": {
              $: {
                w: 28575
              },
              "a:noFill": ""
            }
          };
        };
        ser[chart] = ser[chart] || [];
        ser[chart].push(r);
      });
      /*
            var tag = chart == "column" ? "bar" : chart;
            o ["c:chartSpace"]["c:chart"]["c:plotArea"]["c:barChart"][0]["c:ser"] = ser;
      */
      _.each(ser, function (ser, chart) {
        if (chart == "column") {
          if (me.tplName == "charts") {
            o["c:chartSpace"]["c:chart"]["c:plotArea"]["c:barChart"][0]["c:ser"] = ser;
          } else {
            o["c:chartSpace"]["c:chart"]["c:plotArea"]["c:barChart"]["c:ser"] = ser;
          };
        } else
          if (chart == "bar") {
            if (me.tplName == "charts") {
              o["c:chartSpace"]["c:chart"]["c:plotArea"]["c:barChart"][1]["c:ser"] = ser;
            } else {
              o["c:chartSpace"]["c:chart"]["c:plotArea"]["c:barChart"]["c:ser"] = ser;
            };
          } else {
            o["c:chartSpace"]["c:chart"]["c:plotArea"]["c:" + chart + "Chart"]["c:ser"] = ser;
          };
      });
      me.removeUnusedCharts(o);
      /*
            if (me.showVal) {
              o ["c:chartSpace"]["c:chart"]["c:plotArea"]["c:" + tag + "Chart"]["c:dLbls"]["c:showVal"] = {
                $: {
                  val: "1"
                }
              };
            };
      */
      if (me.chartTitle) {
        me.writeTitle(o, me.chartTitle);
      };
      /*
            o ["c:chartSpace"]["c:chart"]["c:plotArea"]["c:barChart"] = o ["c:chartSpace"]["c:chart"]["c:plotArea"]["c:barChart"][0];
            o ["c:chartSpace"]["c:chart"]["c:plotArea"]["c:catAx"] = o ["c:chartSpace"]["c:chart"]["c:plotArea"]["c:catAx"][0];
            o ["c:chartSpace"]["c:chart"]["c:plotArea"]["c:valAx"] = o ["c:chartSpace"]["c:chart"]["c:plotArea"]["c:valAx"][0];
            delete o ["c:chartSpace"]["c:chart"]["c:plotArea"]["c:lineChart"];
            delete o ["c:chartSpace"]["c:chart"]["c:plotArea"]["c:areaChart"];
      */
      // me.write({ file: "xl/worksheets/sheet2.xml/", object: o });
      me.write({ file: "xl/charts/chart1.xml", object: o });
      cb();
    });
  },
  /*
    Chart title
  */
  writeTitle: function (chart, title) {
    var me = this;
    chart["c:chartSpace"]["c:chart"]["c:title"] = {
      "c:tx": {
        "c:rich": {
          "a:bodyPr": {},
          "a:lstStyle": {},
          "a:p": {
            "a:pPr": {
              "a:defRPr": {}
            },
            "a:r": {
              "a:rPr": {
                $: {
                  lang: "ru-RU"
                }
              },
              "a:t": title
            }
          }
        }
      },
      "c:layout": {},
      "c:overlay": {
        $: {
          val: "0"
        }
      }
    };
    chart["c:chartSpace"]["c:chart"]["c:autoTitleDeleted"] = {
      $: {
        val: "0"
      }
    };
  },
  /*
    Set template name
  */
  setTemplateName: function () {
    var me = this;
    var charts = {};
    _.each(me.data, function (o) {
      charts[o.chart || me.chart] = true;
    });
    me.charts = charts;
    if (charts["radar"]) {
      me.tplName = "radar";
      return;
    };
    if (charts["scatter"]) {
      me.tplName = "scatter";
      return;
    };
    if (charts["pie"]) {
      me.tplName = "pie";
      return;
    };
    if (_.keys(charts).length == 1) {
      me.tplName = _.keys(charts)[0];
      return;
    };
    me.tplName = "charts";
  },
  /*
    Generate XLSX with chart
    chart: column, bar, line, radar, area, scatter, pie
    titles: []
    fields: []
    data: {title: {field: value, ...}, ...}
  */
  generate: function (opts, cb) {
    var me = this;
    opts.type = opts.type || "nodebuffer";
    _.extend(me, opts);
    async.series([
      function (cb) {
        me.zip = new JSZip();
        me.setTemplateName();
        let path = me.templatePath ? me.templatePath : (__dirname + "template/" + me.tplName + ".xlsx");
        console.log("path:", path);
        axios({
          url: path, //your url
          method: 'GET',
          responseType: 'arraybuffer', // important
        }).then((response) => {
          console.log('response',response)
          me.zip.load(response.data);
          cb();
        });
		//也可以使用fetch代替axios            
        //window.fetch(path).then((response) => {
        //  response.arrayBuffer().then(function (buffer) {
        //    // do something with buffer
        //    console.log('response.arraybuffer()', buffer)
        //    me.zip.load(buffer);
        //    cb();
        //  })
        //});
        // fs.readFile(path, function (err, data) {
        //  if (err) {
        //    console.error(`Template ${path} not read: ${err}`);
        //    return cb (err);
        //  };
        //  me.zip.load (data);
        //  cb ();
        // });
        // fs.readFile(path, function (err, data) {
        //  if (err) {
        //    console.error(`Template ${path} not read: ${err}`);
        //    return cb (err);
        //  };
        //  me.zip.load (data);
        //  cb ();
        // });
      },
      function (cb) {
        me.writeStrings(cb);
      },
      function (cb) {
        _.each(me.titles, function (t) {
          me.data[t] = me.data[t] || {};
          _.each(me.fields, function (f) {
            me.data[t][f] = me.data[t][f] || 0;
          });
        });
        me.writeTable(cb);
      },
      function (cb) {
        me.writeChart(cb);
      }
    ], function (err) {
      if (err) {
        return cb(new VError(err, "build"));
      }
      var result = me.zip.generate({ type: me.type });
      cb(null, result);
    });
  }
});
module.exports = Chart;
```

**注意事项:**
由于我们发送axios请求修改了responseType:'arraybuffer',所以我们需要保证此项配置成功,如果项目中使用了mock并引用了就要注意了,因为mock会将全局的axios的responseType设置为 ' ';导致我们发请求无法获取excel的模板文件内容,所以我们需要保证项目中没有使用mock

第二步:准备模板文件
我们将所有的模板文件都放到项目中的public目录下即可通过axios直接请求到了(模板文件可以在先安装xlsx-chart,然后在node_modules中里面拿出来,然后把xlsx-chart卸载掉)	;模板我们只需要基础的即可(columnAvg.xlsx,columnGroup.xlsx,columnGroupAvg.xlsx用不上)
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201222093121863.png)


第三步:在vue中使用
xxx.vue文件
```html
<template>
  <div id="app">
    <img alt="Vue logo" src="./assets/logo.png" />
    <br />
    <button @click="getChartExcel" style="margin: 0 auto">
      导出带图标的excel表格
    </button>
  </div>
</template>

<script>
// xlsx-chart修改后的源码文件
import XLSXChart from "./utils/base";
import FileSaver from "file-saver";

export default {
  name: "App",
  methods: {
    getChartExcel () {
      let xlsxChart = new XLSXChart();
      let opts = {
        chart: "bar",
        titles: ["Price"],
        fields: ["Apple", "Blackberry", "Strawberry", "Cowberry", "jasonchen"],
        data: {
          Price: {
            Apple: 10,
            Blackberry: 5,
            Strawberry: 15,
            Cowberry: 20,
            jasonchen: 2000
          },
        },
        chartTitle: "Area chart",
      };
      xlsxChart.generate(opts, function (err, data) {
        if (err) {
          console.error(err);
        } else {
          let blob = new Blob([data]);
          FileSaver.saveAs(blob, "chart.xlsx");
        }
      });
    }
  },
};

</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
```
第四步:最终效果
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201222093318579.gif#pic_center)

第五步: 进阶使用:
思路:

我们使用过后不难了解到,xlsx-chart这个工具的实现思路就是在需要导出excel时,通过读取本地的excel模板文件,然后使用我们想要展示的数据去替换模板中表格的数据,最终达到图表生成的效果;但是我们能不能在已有模板的基础上多加几个图表呢,答案是可以的而且非常简单

1.我们打开其中一个模板文件column.xlsx;选中我们想要生成图表的列(第一列必选),注意要选中全列
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201222093330685.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3dlaXhpbl8zOTA4NTgyMg==,size_16,color_FFFFFF,t_70)


2.生成图表
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201222093340690.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3dlaXhpbl8zOTA4NTgyMg==,size_16,color_FFFFFF,t_70)


3.重复上述操作生成多个图表后,把这些生成的图表剪切到Chart的sheet中,并保存
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201222093414504.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3dlaXhpbl8zOTA4NTgyMg==,size_16,color_FFFFFF,t_70)


4.再次导出表格(使用保存后的模板)
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201222093430105.gif#pic_center)

**写在最后:**

1.以上就是基于xlsx-chart开发excel导出表格数据带图表的功能,及简单的拓展,如果你有更好的思路可以直接修改base.js的源码和修改excel模板的图表样式甚至往模板中新增excel相关的更多功能等等;

2.文档中的项目链接:https://github.com/Jason-chen-coder/exportExcelForChart

3.xlsx-chart非常强大,我只是基于他base的源码修改了一下,大佬们可以修改他完整版的源码来开发更多的功能

# vue-xlsx-chart-demo

## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```

### Lints and fixes files
```
npm run lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).
