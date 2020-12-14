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
