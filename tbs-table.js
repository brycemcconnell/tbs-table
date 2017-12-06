/*
TBS-Table, Dynamic filter table.
This table is created using "new TbsTable"
It takes three parameters:
data: The source of the information (in JSON) to be displayed in the table, note that nested Objects/arrays are not supported
container: The ID/reference of a "DIV" on your html page, note that it shouldn't be a table element, that will be constructed itself
enableTabs: The Key from your data that will be used as tabs. This is an optional value.
hideColumns: Any keys you don't want to display as strings in an array
Note:
	If no hidden keys are supplied, the enableTabs will be used.
	This means you must manually supply the enableTabs as hidden if you have other hidden keys.	
*/

class TbsTable {

	constructor(data, container, conf = {}) {
		this.data = fetch(data)
		.then(res => res.json())
		.then(out => {
			this.data = out
			conf.onload && conf.onload()
			this.init()
		})
		this.container = container
		this.currentTab = ""
		this.uniqueTabs
		this.enableTabs = conf.enableTabs // Which key will be used as tabs
		this.hideColumns = conf.hideColumns == undefined ? [conf.enableTabs] : conf.hideColumns
		this.table = document.createElement('table')
		this.table.className = "table"
		this.header
		this.searchType = document.createElement('select') 
		this.searchType.className = "custom-select mr-sm-2"
		this.searchField = {
			domElement: document.createElement('input'),
			filter: () => {
				for (let i = 1; i < this.table.rows.length; i++) {
					let td = this.table.rows[i].getElementsByTagName("td")[this.searchType.selectedOptions[0].value];
					if (td) {
						if (td.innerHTML.toUpperCase().indexOf(this.searchField.domElement.value.toUpperCase()) > -1) {
							this.table.rows[i].style.display = "";
						} else {
							this.table.rows[i].style.display = "none";
						}
					}
				}
			}
		}
		this.searchField.domElement.className = "form-control"
		this.searchField.domElement.placeholder = "Query here"
	}

	init() {
		this.uniqueTabs = [...new Set(this.data.map(item => item[this.enableTabs]))]
		this.uniqueTabs.length > 1 ? this.uniqueTabs.unshift(undefined) : null
		this.createTabs()
		this.updateHeaders()
		this.updateTable()
	}

	createTabs() {
		const tabHeader = document.createElement('div')
		tabHeader.className = "navbar justify-content-between"
		const tabContainer = document.createElement('div')
		tabContainer.className = "nav nav-tabs"
		tabHeader.appendChild(tabContainer)
		this.container.appendChild(tabHeader)
		// Create tabs
		const tabs = this.uniqueTabs.map((item) => {
			const itemTab = document.createElement('a')
			itemTab.className = "nav-item nav-link"
			itemTab.href="#"
			// Enter the tab label text, or if tabs aren't enabled, enter "All"
			if (item == undefined) {
				itemTab.innerHTML = "All"
				itemTab.className = "nav-item nav-link active"
			} else {
				itemTab.innerHTML = item
			} 
			itemTab.onclick = () => {
				tabs.forEach(item => item.className = "nav-item nav-link")
				itemTab.classList.add('active')
				this.currentTab = item
				this.table.innerHTML = null
				this.updateHeaders()
				this.updateTable(item)
				this.searchField.filter()
			}
			return itemTab
		})
		tabs.forEach(item => tabContainer.appendChild(item))
		// Create a search box
		const searchBox = document.createElement('div')
		searchBox.className = "form-inline"
		const searchBoxLabel = document.createElement('label')
		searchBoxLabel.innerHTML = "search by"
		searchBoxLabel.className = "mr-sm-2"
		searchBox.appendChild(searchBoxLabel)
		let filteredKeys = Object.keys(this.data[0])
		filteredKeys = filteredKeys.filter(key => !this.hideColumns.includes(key));
		filteredKeys.forEach((col, i) => {
			const option = document.createElement('option')
			option.innerHTML = col
			option.value = i
			this.searchType.appendChild(option)
		})
		searchBox.appendChild(this.searchType)
		searchBox.appendChild(this.searchField.domElement)
		tabHeader.appendChild(searchBox)
		this.searchField.domElement.oninput = () => {
			this.searchField.filter()
		}
		this.searchType.onchange = () => {
			this.searchField.filter()
		}
	}

	updateHeaders() {
		const compareKey = (key, order) => {
			order == undefined ? order = 1 : ""
			return function (a,b) {
				let result = (a[key] < b[key]) ? -1 : (a[key] > b[key]) ? 1 : 0;
				return result * order;
			}
		}
		this.header = document.createElement('thead')
		const headerRow = document.createElement('tr')
		const headerItems = Object.keys(this.data[0]) // Note this assumes all data have the same keys
			.filter(item => !this.hideColumns.includes(item))
			.map((item) => {
				const itemTd = document.createElement('td')
				const itemLabel = document.createElement('span')
				itemLabel.innerHTML = item
				const sortButton = {
					direction: -1,
					target: item,
					icon: "🞃",
					dom: document.createElement('span'),
					update: () => {
						sortButton.dom.innerHTML = sortButton.icon
					}
				}
				sortButton.dom.innerHTML = sortButton.icon
				sortButton.dom.style.cursor = "pointer"
				sortButton.dom.onclick = () => {
					sortButton.icon == "🞃" ? sortButton.icon = "⏶" : sortButton.icon = "🞃"
					sortButton.direction == 1 ? sortButton.direction = -1 : sortButton.direction = 1
					sortButton.update()
					this.data.sort(compareKey(sortButton.target, sortButton.direction))
					const currentHeader = this.table.childNodes[0]
					this.table.innerHTML = null
					this.table.appendChild(currentHeader)
					this.updateTable(this.currentTab)
					// Take the search field function and run it here instead
					// Remember the variables fom it will need to be placed in the constructor (scope)
					this.searchField.filter()
				}
				itemTd.appendChild(sortButton.dom)
				itemTd.appendChild(itemLabel)
				return itemTd
			})
			.forEach(item => headerRow.appendChild(item))
		this.header.appendChild(headerRow)
		this.table.appendChild(this.header)
		this.container.appendChild(this.table)
	}

	updateTable(tab) {
		const filterKey = (object, key) => {
			const {[key]: deletedKey, ...otherKeys} = object;
			return otherKeys;
		}
		let newTable
		let tabContents
		// if enableTabs is set, filter it from the results, else just get the data
		tab ? newTable = this.data.filter((item) => item[this.enableTabs] == tab && item) : newTable = this.data
		tabContents = newTable.map((item) => {
			this.hideColumns.forEach((key) => {
				item = filterKey(item, key)
			})
			return item
		})
		tabContents.forEach((item) => {
			const itemRow = document.createElement('tr')
			const itemFields = Object.entries(item).map(([key, value]) => {
				const field = document.createElement('td')
				if (typeof value === 'object') {
					value = Object.entries(value).map(([valKey, valValue]) => {
						if (typeof valValue === 'object') valValue = JSON.stringify(valValue)
						console.log(valValue)
						return ` ${valValue}`
					})
				}
				field.innerHTML = value
				return field
			})
			itemFields.forEach(tr => itemRow.appendChild(tr))
			this.table.appendChild(itemRow)
		})
	}
}