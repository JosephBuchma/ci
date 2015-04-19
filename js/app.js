'use strict';

(function (global) {

  /**
   * The only function exported to global scope.
   * Renders everything.
   * @return {undefined} none
   */
  function loadDataAndBuildCharts() {
    Papa.parse("session_history.csv", {
      download: true,
      header: true,
      dynamicTyping: true,
      complete: function (d) {
        renderCharts(d.data);
      }
    });
  }


  function renderCharts(data) {
    var chartsData = extractDataset(data);
    renderChart1(chartsData);
    renderChart2(chartsData);
  }


  function renderChart1(data) {
    var abnormalsWithColorsObj = _.reduce(data.abnormal, function (result, n) {
      result[n] = "rgba(220,0,0,1)";
      return result;
    }, {});


    var chartData = {
      labels: data.labels,
      datasets: [
        {
          label: "Passed",
          fillColor: "rgba(50,150,50,0.3)",
          strokeColor: "rgba(10,100,10,0.35)",
          highlightFill: "rgba(50,150,50,0.5)",
          highlightStroke: "rgba(10,100,10,0.7)",
          data: data.datasets.passed
        },
        {
          label: "Failed",
          fillColor: "rgba(220,20,20,0.3)",
          strokeColor: "rgba(220,0,0,0.35)",
          highlightFill: "rgba(220,20,20,0.5)",
          highlightStroke: "rgba(220,0,0,0.7)",
          data: data.datasets.failed,
          highlighted: abnormalsWithColorsObj
        }
      ]
    };
    renderChart("chart1", chartData, 'StackedBar');

  }


  function renderChart2(data) {
    var chartData = {
      labels: data.labels,
      datasets: [
        {
          label: "Build duration",
          fillColor: "rgba(10,100,150,0.1)",
          strokeColor: "rgba(10,100,180,0.5)",
          highlightFill: "rgba(50,150,50,0.5)",
          highlightStroke: "rgba(10,100,10,0.7)",
          data: data.datasets.duration
        }
      ]
    };
    renderChart("chart2", chartData, 'Line');
  }


  /**
   * #renderChart function renders chart with legend.
   * It assumes that id of div for legend is canvasId + "Legend"
   * 
   * @param  {string} canvasId      id of canvas element to render chart on
   * @param  {object} chartData     contains Chart.js data object to pass into chart
   * @param  {string} chartType     Chart.js chart type. Tested with 'Bar', 'StackedBar' and 'Line'
   * @param  {object} chartOptions  Chart.hs chart options object
   * @return {undefined}            nothing to return
   */
  function renderChart(canvasId, chartData, chartType, chartOptions) {
    if (chartOptions === undefined) {
      chartOptions = {};
    }
    var ctx = $('#'+canvasId)[0].getContext("2d");
    var chart = new Chart(ctx)[chartType](chartData, chartOptions);
    $('#'+canvasId+'Legend').html(chart.generateLegend());
  }


  /**
   * #extractDataset function retrieves required datasets from parsed csv file.
   * Actually, this function could be rewriten into smaller independent reusable DRY pieces.
   * 
   * @param  {object} allData   parsed data frm csv
   * @return {object}           returns object:
   *                            {
   *                              labels: [...],    // list of chart labels (dates, in particular case) 
   *                              datasets: {
   *                                duration:[...], // list of durations per day 
   *                                passed:[...],   // list of passed builds per day
   *                                failed:[...]    // list of failed builds per day
   *                               } 
   *                            }
   */
  function extractDataset(allData) {

    var groupedByDay = _(allData).groupBy(function (n) {
      var date = new Date(n.created_at.slice(0, 10));
      return date.getTime();
    });

    var orderedDates = groupedByDay.keys().sort();

    var datasets = {
      duration: [],
      passed: [],
      failed: []
    };

    var statuses_cnt;
    orderedDates.each(function (date) {
      statuses_cnt = _.countBy(groupedByDay.get(date), 'summary_status');
      datasets.passed.push(statuses_cnt.passed || 0);
      datasets.failed.push(statuses_cnt.failed || 0);

      datasets.duration.push(_.sum(groupedByDay.get(date), 'duration'))
    }).value();

    var humanReadableDates = orderedDates.map(function (k) {
      var d = new Date(+k);
      return d.toString().slice(4, 16);
    }).value();

    return {
      labels: humanReadableDates,
      datasets: datasets,
      abnormal: findAbnormal(datasets.passed, datasets.failed)
    };
  }

  /**
   * #findAbnormal looking for days with 'abnormal' amount
   * of failing builds
   * @param  {array} passedArr  of integers, each represents amount of passed builds per day
   * @param  {array} failedArr  array of integers, each represents amount of failed builds per day
   * @return {array}            array with indexes of days with 'abnormal' amount of fails
   */
  function findAbnormal(passedArr, failedArr) {
    var totalTmp; 
    var absDiff;
    var abnormalityCoefficients = _.map(_.zip(passedArr, failedArr), function (p) {
      return p[0] ? p[1]/(p[0]+p[1]) : (p[1] <= 5 ? 0.2 * p[1] : 1);
    });


    var mean = ss.mean(abnormalityCoefficients);
    var deviation = ss.standard_deviation(abnormalityCoefficients);


    var ret = _.reduce(abnormalityCoefficients, function (result, n, ind) {
      if (n > mean + deviation) {
        result.push(ind);
      }
      return result;
    }, []);

    return ret;
  }


  global.loadDataAndBuildCharts = loadDataAndBuildCharts;

})(this);


$(function () {
  loadDataAndBuildCharts();
});
