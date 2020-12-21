<template>
  <div id="app">
    <img alt="Vue logo" src="./assets/logo.png" />
    <br />
    <!-- <HelloWorld msg="Welcome to Your Vue.js App" /> -->
    <button @click="getChartExcel" style="margin: 0 auto">
      导出带图标的excel表格
    </button>
  </div>
</template>

<script>
// import HelloWorld from "./components/HelloWorld.vue";
import XLSXChart from "./utils/base";
import FileSaver from "file-saver";

export default {
  name: "App",
  components: {
    // HelloWorld,
  },
  methods: {
    getChartExcel () {

      let xlsxChart = new XLSXChart();
      let opts = {
        chart: "column",
        titles: ["Price"],
        fields: ["Apple", "Blackberry", "Strawberry", "Cowberry", "jasonchen", 'lemon', 'orange'],
        data: {
          Price: {
            Apple: 100,
            Blackberry: 250,
            Strawberry: 150,
            Cowberry: 120,
            jasonchen: 240,
            lemon: 130,
            orange: 90
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
