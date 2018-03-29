var $ = require('jquery')
require('datatables.net-responsive')(window, $)
require('eonasdan-bootstrap-datetimepicker')
require('select2')($)

// var dt = null
var moment = require('moment')
// var moment = null
var NProgress = require('nprogress')
var Promise = require('bluebird')

var log = require('../lib/logger')

const TAG = 'View'

class View {
  constructor (rootElement) {
    this._rootElement = rootElement
    // Hold reference to all buttons
    this._buttonElements = []
  }

  // --------------------------------------------------------------
  // PUBLIC FUNCTIONS
  // --------------------------------------------------------------
  initialize (conf) {
    // console.log(`rootElement=${JSON.stringify(this.rootElement)}`)
    // console.log(`conf=${JSON.stringify(conf)}`)
    this._tableConf = conf.table
    const buttonsConf = conf.buttons
    const designConf = conf.design
    this._htmlElements = this._initLayout(this._rootElement, this._tableConf, designConf)
    // Bootstrap alert
    this._notification = this._htmlElements.notif
    this._initInputForm(this._htmlElements.inputForm, this._tableConf, buttonsConf)
    this._initTable(this._htmlElements.table, this._tableConf)
    this._dataTable = this._initDataTable(this._htmlElements.table, this._tableConf)
  }

  setOnRowClickedListener (fn) {
    // fn(rowData)
    this._onRowClickedListener = fn
  }

  setOnTableDrawnListener (fn) {
    this._onTableDrawnListener = fn
  }

  setOnButtonClickedListener (fn) {
    // fn(postTo)
    this._onButtonClicked = fn
  }

  // Add view next to the search UI
  setFirstCustomView (htmlElement) {
    this._htmlElements.firstCustomView.empty()
    this._htmlElements.firstCustomView.append(htmlElement)
  }

  // Add view next to the first custom view
  setSecondCustomView (htmlElement) {
    this._htmlElements.secondCustomView.empty()
    this._htmlElements.secondCustomView.append(htmlElement)
  }

  setNotif (text, error = false) {
    this._notification.removeClass('alert-success')
    this._notification.removeClass('alert-danger')
    this._notification.show()
    this._notification.html(text)
    this._notification.addClass(`alert-${error ? 'danger' : 'success'}`)
  }

  clearInputHighlight () {
    this._tableConf.ui.forEach((field) => {
      this._htmlElements.inputForm.find(`[name="${field.id}"]`).removeClass('highlight-error')
      // $('input[name=' + field.id + ']').removeClass('highlight-error')
    })
  }

  setInputHighlight (errorFields) {
    this.clearInputHighlight()
    errorFields.forEach((field) => {
      this._htmlElements.inputForm.find(`[name="${field}"]`).addClass('highlight-error')
      // $('input[name=' + field + ']').addClass('highlight-error')
    })
  }

  clearNotif () {
    this._notification.removeClass('alert-success')
    this._notification.removeClass('alert-danger')
    this._notification.hide()
  }

  getCurrentRow (fn) {
    // fn(rowData)
    // When a row is selected, keep track of the selected row
    // This method then just returns it
    return this._selectedData
  }

  // Serialize input form
  getInputFormData () {
    return this._htmlElements.inputForm.serialize()
  }

  setSingleFormData (inputName, data) {
    if (typeof data === 'object') {
      /*
        data: {
          school: {
            name: 'Bunda Mulia'
          }
        }
      */
      Object.keys(data || []).forEach(key => {
        this.setSingleFormData(inputName + '.' + key, data[key])
      })
    } else {
      this._htmlElements.inputForm.find(`[name="${inputName}"]`).val(data)
      // Update select2 UI
      this._htmlElements.inputForm.find(`select[name="${inputName}"]`).trigger('change')
    }
  }

  setInputFormData (json) {
    Object.keys(json).forEach(key => {
      this.setSingleFormData(key, json[key])
    })
  }

  // rows: [{name: 'Bugs', type: 'Bunny'}]
  // Invariant, keys has to match one in tableConf
  setRows (rows) {
    rows.reduce((dt, row) => {
      // https://datatables.net/reference/api/row.add()
      return dt.row.add(row)
    }, this._dataTable.clear()).draw()

    this._dataTable.responsive.recalc()
  }

  addRow (row) {
    this._dataTable.row.add(row).draw()
  }

  startProgressbar () {
    NProgress.start()
  }

  finishProgressbar () {
    NProgress.done()
  }

  // Enable all the buttons on this nc-input-library
  enableButtons () {
    this._buttonElements.forEach(button => {
      button.prop('disabled', false)
    })
  }

  // Disable all the buttons on this nc-input-library
  disableButtons () {
    this._buttonElements.forEach(button => {
      button.prop('disabled', true)
    })
  }

  // --------------------------------------------------------------

  _initDataTable (tableElement, tableConf) {
    const columns = []
    var idToColumnIndexMap = {}
    for (var i = 0; i < tableConf.ui.length; i++) {
      let colConf = {
        data: tableConf.ui[i].id,
        name: tableConf.ui[i].id // used to refer to this column, instead of using index
      }

      if (tableConf.ui[i].type === 'date' || tableConf.ui[i].input === 'date') {
        let dateFormat = 'YYYY-MM-DD hh:mm:ss'
        if (tableConf.ui[i].data && tableConf.ui[i].data.dateFormat) {
          dateFormat = tableConf.ui[i].data.dateFormat
        }

        colConf.render = function (data, type, full, meta) {
          return moment(data).utc().format(dateFormat)
        }
      }

      if (tableConf.ui[i].dataTable === true) {
        columns.push(colConf)
      }
      idToColumnIndexMap[tableConf.ui[i].id] = columns.length - 1
    }

    // From user order is of form [[tableId, desc']]
    // we have to convert it to [[colId, 'desc']]
    const order = (tableConf.conf.order || []).map(data => {
      return [idToColumnIndexMap[data[0]], data[1]]
    })
    const dataTable = tableElement.DataTable({
      columns,
      order,
      responsive: true
    })

    // Hook onRowClickListener
    var selectedRow = null
    const self = this
    tableElement.find('tbody').on('click', 'tr', function () {
      self._selectedData = dataTable.row(this).data()
      if (selectedRow) {
        selectedRow.removeClass('highlight-dt-row')
      }
      selectedRow = $(this).closest('tr')

      selectedRow.addClass('highlight-dt-row')
      self._onRowClickedListener(self._selectedData)
    })

    // Hook onDrawListener
    dataTable.on('draw.dt', () => {
      const appliedRows = dataTable.rows({filter: 'applied'}).data()
      if (this._onTableDrawnListener) {
        this._onTableDrawnListener(appliedRows)
      }
    })

    return dataTable
  }

  _initInputForm (formElement, tableConf, buttonsConf) {
    log.verbose(TAG, '_initInputForm(): tableConf=' + JSON.stringify(tableConf))
    const colMd = tableConf.conf.numColumn >= 3 ? 'col-md-4' : 'col-md-6'
    var row = $('<div class="row" />')
    formElement.append(row)
    // Inputs
    for (let i = 0; i < tableConf.ui.length; i++) {
      if (tableConf.ui[i].input === 'text') {
        const formGroup = $(`<div class="${colMd} form-group" style="height:60px;" />`)
        row.append(formGroup)
        const label = $('<label/>')
        label.html(tableConf.ui[i].desc)
        formGroup.append(label)
        const input = $(`<input class="form-control input-md" name="${tableConf.ui[i].id}" type="text" placeholder="${tableConf.ui[i].placeholder || ''}" ${tableConf.ui[i].disabled ? ' readonly' : ''} />`)
        formGroup.append(input)
      } else if (tableConf.ui[i].input === 'password') {
        const formGroup = $(`<div class="${colMd} form-group" style="height:60px;" />`)
        row.append(formGroup)
        const label = $('<label/>')
        label.html(tableConf.ui[i].desc)
        formGroup.append(label)
        const input = $(`<input class="form-control input-md" name="${tableConf.ui[i].id}" type="password" placeholder="${tableConf.ui[i].placeholder || ''}" ${tableConf.ui[i].disabled ? ' readonly' : ''} />`)
        formGroup.append(input)
      } else if (tableConf.ui[i].input === 'date') {
        const formGroup = $(`<div class="${colMd} form-group" style="height:60px;" />`)
        row.append(formGroup)
        const label = $('<label/>')
        label.html(tableConf.ui[i].desc)
        formGroup.append(label)
        const input = $(`<input class="form-control input-md" name="${tableConf.ui[i].id}" type="text" placeholder="${tableConf.ui[i].placeholder || ''}" ${tableConf.ui[i].disabled ? ' readonly' : ''} />`)
        let dateFormat = 'YYYY-MM-DD hh:mm'
        if (tableConf.ui[i].data && tableConf.ui[i].data.dateFormat) {
          dateFormat = tableConf.ui[i].data.dateFormat
        }
        input.datetimepicker({
          format: dateFormat,
          defaultDate: moment().format(dateFormat)
        })
        formGroup.append(input)
      } else if (tableConf.ui[i].input === 'textArea') {
        const formGroup = $(`<div class="${colMd} form-group" />`)
        row.append(formGroup)
        const label = $('<label/>')
        label.html(tableConf.ui[i].desc)
        formGroup.append(label)
        const input = $(`<textarea class="form-control input-md" name="${tableConf.ui[i].id}" rows="2" placeholder="${tableConf.ui[i].placeholder || ''}" '/>`)
        formGroup.append(input)
      } else if (tableConf.ui[i].input === 'hidden') {
        const formGroup = $(`<div class="${colMd} form-group" style="height:60px;" />`)
        row.append(formGroup)
        const label = $('<label/>')
        label.html(tableConf.ui[i].desc)
        formGroup.append(label)
        const input = $(`<input class="form-control input-md" name="${tableConf.ui[i].id}" type="hidden"/>`)
        formGroup.append(input)
      } else if (tableConf.ui[i].input === 'select') {
        const formGroup = $(`<div class="${colMd} form-group" style="height:60px;" />`)
        row.append(formGroup)
        const label = $('<label/>')
        label.html(tableConf.ui[i].desc)
        formGroup.append(label)
        let inputSelect
        let selectData = tableConf.ui[i].selectData()

        if (selectData instanceof Array) {
          inputSelect = $(`<select name="${tableConf.ui[i].id}" class="form-control"></select>`)
          selectData.forEach((element, index) => {
            var optionElement = $(`<option value="${element}">${element}</option>`)
            inputSelect.append(optionElement)
          })
          formGroup.append(inputSelect)
          inputSelect.select2()
        } else if (selectData instanceof Promise) {
          // NOTE: We intentionally create select2 js first before appending the data, so that
          // user of nc-input-library can expect UI initialization to be synchronous
          // (i.e. user wants to attach to the select2 event)
          inputSelect = $(`<select name="${tableConf.ui[i].id}" class="form-control"></select>`)
          formGroup.append(inputSelect)
          inputSelect.select2()
          selectData.then(resp => {
            resp.forEach((element, index) => {
              var optionElement = $(`<option value="${element}">${element}</option>`)
              inputSelect.append(optionElement)
            })
          }).catch(err => {
            console.error(err)
          })
        } else if (typeof selectData === 'object') {
          /* Select data source is AJAX
            selectData = {
              url: 'http://test.com/getData', // Returns array of object
              searchVar: 'key'  // Key of target object
            }
          */
          inputSelect = $(`<select name="${tableConf.ui[i].id}" class="form-control"></select>`)
          formGroup.append(inputSelect)
          inputSelect.select2({
            ajax: {
              url: selectData.url,
              dataType: 'json',
              delay: 250,
              processResults: function (resp) {
                if (resp.status) {
                  return {
                    results: resp.data.map((data) => {
                      return {id: data[selectData.searchVar], text: data[selectData.searchVar]}
                    })
                  }
                } else {
                  console.error(selectData.url + ' does not return valid response!')
                }
              },
              cache: false
            }
          })
        } else {
          console.error('Error instance of selectData, neither Promise or Array')
        }
      }
    }

    // Buttons
    row = $('<div class="row" />')
    for (let i = 0; i < buttonsConf.ui.length; i++) {
      const id = buttonsConf.ui[i].id
      var col = $('<div class="col-md-3" />')
      row.append(col)
      var button = $('<button class="btn btn-default btn-block" type="button" id="btn_' + id + '">' +
          buttonsConf.ui[i].desc + '</button>')
      button.click(event => {
        if (this._onButtonClicked) {
          this._onButtonClicked(id, buttonsConf.ui[i].postTo, event)
        }
      })
      col.append(button)

      // Save the reference to this button
      this._buttonElements.push(button)
    }
    formElement.append(row)
  }

  _initTable (tableElement, tableConf) {
    // Create and append table head
    var thead = $('<thead />')
    var tr = $('<tr />')
    for (let i = 0; i < tableConf.ui.length; i++) {
      if (tableConf.ui[i].dataTable) {
        var th = $('<th>' + tableConf.ui[i].desc + '</th>')
        tr.append(th)
      }
    }
    thead.append(tr)
    tableElement.append(thead)
  }

  /* Initialize HTML layout to place the element
     (i.e. empty div for inputs, empty div for buttons, and empty table)

     return:
      {
        inputForm: ...,
        notif: ...,
        firstCustomView:
        secondCustomView:
        table:
      }
  */
  _initLayout (rootElement, tableConf, designConf) {
    const initialized = {}
    // Initialze bootstrap panel
    var panel = $('<div class="panel panel-default" />')
    rootElement.append(panel)
    var panelHeading = $('<div class="panel-heading"/>')
    panel.append(panelHeading)
    var panelTitle = $(`<h3 class="panel-title">${designConf.title || 'Input Form'}</h3>`)
    panelHeading.append(panelTitle)
    var panelBody = $('<div class="panel-body" />')
    panel.append(panelBody)

    // Initialize HTML form used for inputs
    var row = $('<div class="row" />')
    panelBody.append(row)
    var col = $('<div class="col-md-12" />')
    initialized.inputForm = $('<form class="ncInputForm" />')
    row.append(col)
    col.append(initialized.inputForm)

    row = $('<div class="row" />')
    panelBody.append(row)
    col = $('<div class="col-md-12"/>')
    row.append(col)
    initialized.notif = $('<div class="alert alert-success" style="text-align: center; display: none; margin: auto; margin-bottom: 2%;" role="alert"/>')
    col.append(initialized.notif)

    // Initialize HTML form used for inputs
    row = $('<div class="row" />')
    // Initialize HTML elements for DataTable search
    const searchUI = this._initializeSearchUI(tableConf)
    initialized.firstCustomView = $('<div class="col-md-4" />')
    initialized.secondCustomView = $('<div class="col-md-4" />')
    row.append(searchUI)
    row.append(initialized.firstCustomView)
    row.append(initialized.secondCustomView)
    panelBody.append(row)

    // Iniitialize HTML table used for DataTable
    row = $('<div class="row" />')
    panelBody.append(row)
    col = $('<div class="col-md-12" />')
    initialized.table = $('<table class="custom-table table-stripped table-bordered table-hover" />')
    row.append(col)
    col.append(initialized.table)

    return initialized
  }

  _initializeSearchUI (tableConf) {
    var divColMd4 = $('<div class="col-md-4"></div>')
    var labelSearch = $('<label>Search</label><br/>')
    divColMd4.append(labelSearch)

    // The UI allows user to search with multiple criterion.
    // For example, user can filter by ID, then filter by namaStandard
    // Within the first filter, there is a + button to add more filter.
    // On the subsequent filter, the button is -, which is to remove
    // that filter.
    const btnAddFilter = $('<button type="button" class="btn btn-info btn-add-filter" style="display:inline-block; width: 12%;">+</button>')
    function addFilterUI (firstFilter) {
      var searchOption = $('<select class="form-control custom-dt-search-option" style="display:inline-block; width:88%;" />')
      for (var i = 0; i < tableConf.ui.length; i++) {
        if (tableConf.ui[i].desc) {
          // The cryptic string '[columnName]:name' is used to find datatable column by its name
          searchOption.append($('<option value="' + tableConf.ui[i].id + ':name">' + tableConf.ui[i].desc + '</option>'))
        }
      }

      var searchText = $('<input class="form-control custom-dt-search" type="text" />')

      var filterContent = ($('<div />'))
      filterContent.append(searchOption)

      if (!firstFilter) {
        const btnRemoveFilter = $('<button type="button" class="btn btn-danger btn-remove" style="display:inline-block; width: 12%;">-</button>')
        filterContent.append(btnRemoveFilter)
      } else {
        filterContent.append(btnAddFilter)
      }

      filterContent.append(searchText)
      return filterContent
    }

    var divCurrFilter = $('<div section="current_filter" />')
    divCurrFilter.append(addFilterUI(true))

    divColMd4.append(divCurrFilter)

    btnAddFilter.on('click', function (e) {
      $(this).parent().parent().append(addFilterUI())
    })

    const self = this
    function performMultiSearch (searchValue, searchOption) {
      var divCurrentFilter = divCurrFilter.children()
      Array.from(divCurrentFilter).reduce((acc, value) => {
        // result columnName = namaKain
        const columnName = $(value).find('select').val()
        const searchText = $(value).find('input[type=text]').val()
        // Last two argument: use regex and don't use smart search
        return acc.column(columnName).search(searchText, true, false)
      }, self._dataTable).draw()
    }

    function clearSearch () {
      self._dataTable.search('').columns().search('').draw()
    }

    // when typing in the input box & dropdown change
    $(divCurrFilter).on('keyup change', function (e) {
      clearSearch()
      performMultiSearch()
    })

    // button remove when clicked action
    $(divCurrFilter).on('click', '.btn-remove', function (e) {
      $(this).parent().remove()
      clearSearch()
      performMultiSearch()
    })

    return divColMd4
  }
}

module.exports = View
