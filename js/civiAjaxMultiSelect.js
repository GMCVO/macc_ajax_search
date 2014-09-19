/*
// civiAjaxMultiSelect
// derived from:
//
// jQuery multiSelect
//
// Version 1.2.2 beta
//
// Cory S.N. LaViska
// A Beautiful Site (http://abeautifulsite.net/)
// 09 September 2009
//
// Visit http://abeautifulsite.net/notebook/62 for more information
//
// (Amended by Andy Richmond, Letters & Science Deans' Office, University of California, Davis)
//
// Usage: $('#control_id').multiSelect( options, callback )
//
// Options:  selectAll          - whether or not to display the Select All option; true/false, default = true
//           selectAllText      - text to display for selecting/unselecting all options simultaneously
//           noneSelected       - text to display when there are no selected items in the list
//           oneOrMoreSelected  - text to display when there are one or more selected items in the list
//                                (note: you can use % as a placeholder for the number of items selected).
//                                Use * to show a comma separated list of all selected; default = '% selected'
//           optGroupSelectable - whether or not optgroups are selectable if you use them; true/false, default = false
//           listHeight         - the max height of the droptdown options
//
// Dependencies:  jQuery 1.2.6 or higher (http://jquery.com/)
//
// Change Log:
//
//		1.0.1	- Updated to work with jQuery 1.2.6+ (no longer requires the dimensions plugin)
//				- Changed $(this).offset() to $(this).position(), per James' and Jono's suggestions
//
//		1.0.2	- Fixed issue where dropdown doesn't scroll up/down with keyboard shortcuts
//				- Changed '$' in setTimeout to use 'jQuery' to support jQuery.noConflict
//				- Renamed from jqueryMultiSelect.* to jquery.multiSelect.* per the standard recommended at
//				  http://docs.jquery.com/Plugins/Authoring (does not affect API methods)
//
//		1.0.3	- Now uses the bgiframe plugin (if it exists) to fix the IE6 layering bug.
//              - Forces IE6 to use a min-height of 200px (this needs to be added to the options)
//
//		1.1.0	- Added the ability to update the options dynamically via javascript: multiSelectOptionsUpdate(JSON)
//              - Added a title that displays the whole comma delimited list when using oneOrMoreSelected = *
//              - Moved some of the functions to be closured to make them private
//              - Changed the way the keyboard navigation worked to more closely match how a standard dropdown works
//              - ** by Andy Richmond **
//
//		1.2.0	- Added support for optgroups
//              - Added the ability for selectable optgroups (i.e. select all for an optgroup)
//              - ** by Andy Richmond **
//
//		1.2.1	- Fixed bug where input text overlapped dropdown arrow in IE (i.e. when using oneOrMoreSelected = *)
//              - Added option "listHeight" for min-height of the dropdown
//              - Fixed bug where bgiframe was causing a horizontal scrollbar and on short lists extra whitespace below the options
//              - ** by Andy Richmond **
//
//		1.2.2	- Fixed bug where the keypress stopped showing the dropdown because in jQuery 1.3.2 they changed the way ':visible' works
//              - Fixed some other bugs in the way the keyboard interface worked
//              - Changed the main textbox to an <a> tag (with 'display: inline-block') to prevent the display text from being selected/highlighted
//              - Added the ability to jump to an option by typing the first character of that option (simular to a normal drop down)
//              - ** by Andy Richmond **
//				- Added [] to make each control submit an HTML array so $.serialize() works properly
//
// Licensing & Terms of Use
// 
// This plugin is dual-licensed under the GNU General Public License and the MIT License and
// is copyright 2008 A Beautiful Site, LLC. 
//	
*/
if(jQuery) (function($){
	
	// Building the actual options
	function buildOptions()
	{
		var multiSelect = $(this);
		var multiSelectOptions = multiSelect.next('.multiSelectOptions');
		var o = multiSelect.data("config");
		var callback = multiSelect.data("callback");

		// variables needed to account for width changes due to a scrollbar
		var initialWidth = multiSelectOptions.width();
		var hasScrollbar = false;
		
		// set the height of the dropdown options
		if(multiSelectOptions.height() > o.listHeight) {
			multiSelectOptions.css("height", o.listHeight + 'px');
			hasScrollbar = true;
		} else {
			multiSelectOptions.css("height", '');
		}
		
		// if the there is a scrollbar and the browser did not already handle adjusting the width (i.e. Firefox) then we will need to manaually add the scrollbar width
		var scrollbarWidth = hasScrollbar && (initialWidth == multiSelectOptions.width()) ? 17 : 0;

		// set the width of the dropdown options
		if((multiSelectOptions.width() + scrollbarWidth) < multiSelect.outerWidth()) {
			multiSelectOptions.css("width", multiSelect.outerWidth() - 2/*border*/ + 'px');
		} else {
			multiSelectOptions.css("width", (multiSelectOptions.width() + scrollbarWidth) + 'px');
		}
		
		// Apply bgiframe if available on IE6
		if( $.fn.bgiframe ) multiSelect.next('.multiSelectOptions').bgiframe( { width: multiSelectOptions.width(), height: multiSelectOptions.height() });

		// Handle selectAll oncheck
		if(o.selectAll) {
			multiSelectOptions.find('INPUT.selectAll').click( function() {
				// update all the child checkboxes
				multiSelectOptions.find('INPUT:checkbox').attr('checked', $(this).attr('checked')).parent("LABEL").toggleClass('checked', $(this).attr('checked'));
			});
		}
		
		// Handle OptGroup oncheck
		if(o.optGroupSelectable) {
			multiSelectOptions.addClass('optGroupHasCheckboxes');
		
			multiSelectOptions.find('INPUT.optGroup').click( function() {
				// update all the child checkboxes
				$(this).parent().next().find('INPUT:checkbox').attr('checked', $(this).attr('checked')).parent("LABEL").toggleClass('checked', $(this).attr('checked'));
			});
		}
		
		// Handle all checkboxes
		multiSelectOptions.find('INPUT:checkbox').click( function() {
			// set the label checked class
			$(this).parent("LABEL").toggleClass('checked', $(this).attr('checked'));
			
			updateSelected.call(multiSelect);
			multiSelect.focus();
			if($(this).parent().parent().hasClass('optGroupContainer')) {
				updateOptGroup.call(multiSelect, $(this).parent().parent().prev());
			}
			if( callback ) {
				callback($(this));
			}
		});
		
		// Initial display
		multiSelectOptions.each( function() {
			$(this).find('INPUT:checked').parent().addClass('checked');
		});
		
		// Initialize selected and select all 
		updateSelected.call(multiSelect);
		
		// Initialize optgroups
		if(o.optGroupSelectable) {
			multiSelectOptions.find('LABEL.optGroup').each( function() {
				updateOptGroup.call(multiSelect, $(this));
			});
		}
		
		// Handle hovers
		multiSelectOptions.find('LABEL:has(INPUT)').hover( function() {
			$(this).parent().find('LABEL').removeClass('hover');
			$(this).addClass('hover');
		}, function() {
			$(this).parent().find('LABEL').removeClass('hover');
		});
		
		// Keyboard
		multiSelect.keydown( function(e) {
		
			var multiSelectOptions = $(this).next('.multiSelectOptions');

			// Is dropdown visible?
			if( multiSelectOptions.css('visibility') != 'hidden' ) {
				// Dropdown is visible
				// Tab
				if( e.keyCode == 9 ) {
					$(this).addClass('focus').trigger('click'); // esc, left, right - hide
					$(this).focus().next(':input').focus();
					return true;
				}
				
				// ESC, Left, Right
				if( e.keyCode == 27 || e.keyCode == 37 || e.keyCode == 39 ) {
					// Hide dropdown
					$(this).addClass('focus').trigger('click');
				}
				// Down || Up
				if( e.keyCode == 40 || e.keyCode == 38) {
					var allOptions = multiSelectOptions.find('LABEL');
					var oldHoverIndex = allOptions.index(allOptions.filter('.hover'));
					var newHoverIndex = -1;
					
					// if there is no current highlighted item then highlight the first item
					if(oldHoverIndex < 0) {
						// Default to first item
						multiSelectOptions.find('LABEL:first').addClass('hover');
					}
					// else if we are moving down and there is a next item then move
					else if(e.keyCode == 40 && oldHoverIndex < allOptions.length - 1)
					{
						newHoverIndex = oldHoverIndex + 1;
					}
					// else if we are moving up and there is a prev item then move
					else if(e.keyCode == 38 && oldHoverIndex > 0)
					{
						newHoverIndex = oldHoverIndex - 1;
					}

					if(newHoverIndex >= 0) {
						$(allOptions.get(oldHoverIndex)).removeClass('hover'); // remove the current highlight
						$(allOptions.get(newHoverIndex)).addClass('hover'); // add the new highlight
						
						// Adjust the viewport if necessary
						adjustViewPort(multiSelectOptions);
					}
					
					return false;
				}

				// Enter, Space
				if( e.keyCode == 13 || e.keyCode == 32 ) {
					var selectedCheckbox = multiSelectOptions.find('LABEL.hover INPUT:checkbox');
					
					// Set the checkbox (and label class)
					selectedCheckbox.attr('checked', !selectedCheckbox.attr('checked')).parent("LABEL").toggleClass('checked', selectedCheckbox.attr('checked'));
					
					// if the checkbox was the select all then set all the checkboxes
					if(selectedCheckbox.hasClass("selectAll")) {
						multiSelectOptions.find('INPUT:checkbox').attr('checked', selectedCheckbox.attr('checked')).parent("LABEL").addClass('checked').toggleClass('checked', selectedCheckbox.attr('checked')); 
					}

					updateSelected.call(multiSelect);
					
					if( callback ) callback($(this));
					return false;
				}

				// Any other standard keyboard character (try and match the first character of an option)
				if( e.keyCode >= 33 && e.keyCode <= 126 ) {
					// find the next matching item after the current hovered item
					var match = multiSelectOptions.find('LABEL:startsWith(' + String.fromCharCode(e.keyCode) + ')');
					
					var currentHoverIndex = match.index(match.filter('LABEL.hover'));
					
					// filter the set to any items after the current hovered item
					var afterHoverMatch = match.filter(function (index) {
						return index > currentHoverIndex;
					});

					// if there were no item after the current hovered item then try using the full search results (filtered to the first one)
					match = (afterHoverMatch.length >= 1 ? afterHoverMatch : match).filter("LABEL:first");

					if(match.length == 1) {
						// if we found a match then move the hover
						multiSelectOptions.find('LABEL.hover').removeClass('hover');								
						match.addClass('hover');
						
						adjustViewPort(multiSelectOptions);
					}
				}
			} else {
				// Dropdown is not visible
				if( e.keyCode == 38 || e.keyCode == 40 || e.keyCode == 13 || e.keyCode == 32 ) { //up, down, enter, space - show
					// Show dropdown
					$(this).removeClass('focus').trigger('click');
					multiSelectOptions.find('LABEL:first').addClass('hover');
					return false;
				}
				//  Tab key
				if( e.keyCode == 9 ) {
					// Shift focus to next INPUT element on page
					multiSelectOptions.next(':input').focus();
					return true;
				}
			}
			// Prevent enter key from submitting form
			if( e.keyCode == 13 ) return false;
		});
	}
	
	// Adjust the viewport if necessary
	function adjustViewPort(multiSelectOptions)
	{
		// check for and move down
		var selectionBottom = multiSelectOptions.find('LABEL.hover').position().top + multiSelectOptions.find('LABEL.hover').outerHeight();
		
		if(selectionBottom > multiSelectOptions.innerHeight()){		
			multiSelectOptions.scrollTop(multiSelectOptions.scrollTop() + selectionBottom - multiSelectOptions.innerHeight());
		}
		
		// check for and move up						
		if(multiSelectOptions.find('LABEL.hover').position().top < 0){		
			multiSelectOptions.scrollTop(multiSelectOptions.scrollTop() + multiSelectOptions.find('LABEL.hover').position().top);
		}
	}
	
	// Update the optgroup checked status
	function updateOptGroup(optGroup)
	{
		var multiSelect = $(this);
		var o = multiSelect.data("config");
		
		// Determine if the optgroup should be checked
		if(o.optGroupSelectable) {
			var optGroupSelected = true;
			$(optGroup).next().find('INPUT:checkbox').each( function() {
				if( !$(this).attr('checked') ) {
					optGroupSelected = false;
					return false;
				}
			});
			
			$(optGroup).find('INPUT.optGroup').attr('checked', optGroupSelected).parent("LABEL").toggleClass('checked', optGroupSelected);
		}
	}
	
	// Update the textbox with the total number of selected items, and determine select all
	function updateSelected() {
		var multiSelect = $(this);
		var multiSelectOptions = multiSelect.next('.multiSelectOptions');
		var o = multiSelect.data("config");
		
		var i = 0;
		var selectAll = true;
		var display = '';
		multiSelectOptions.find('INPUT:checkbox').not('.selectAll, .optGroup').each( function() {
			if( $(this).attr('checked') ) {
				i++;
				display = display + $(this).parent().text() + ', ';
			}
			else selectAll = false;
		});
		
		// trim any end comma and surounding whitespace
		display = display.replace(/\s*\,\s*$/,'');
		
		if( i == 0 ) {
			multiSelect.find("span").html( o.noneSelected );
		} else {
			if( o.oneOrMoreSelected == '*' ) {
				multiSelect.find("span").html( display );
				multiSelect.attr( "title", display );
			} else {
				multiSelect.find("span").html( o.oneOrMoreSelected.replace('%', i) );
			}
		}

		// Determine if Select All should be checked
		if(o.selectAll) {
			multiSelectOptions.find('INPUT.selectAll').attr('checked', selectAll).parent("LABEL").toggleClass('checked', selectAll);
		}
	}
	
	$.extend($.fn, {
		multiSelect: function(o, callback) {
			// Default options
			if( !o ) o = {};
			if( o.selectAll == undefined ) o.selectAll = true;
			if( o.selectAllText == undefined ) o.selectAllText = "Select All";
			if( o.noneSelected == undefined ) o.noneSelected = 'Select options';
			if( o.oneOrMoreSelected == undefined ) o.oneOrMoreSelected = '% selected';
			if( o.optGroupSelectable == undefined ) o.optGroupSelectable = false;
			if( o.listHeight == undefined ) o.listHeight = 150;

			// Initialize each multiSelect
			$(this).each( function() {
				var multiSelect = $(this);
				var multiSelectOptions = multiSelect.next('.multiSelectOptions');
				
				// Attach the config options to the multiselect
				multiSelect.data("config", o);
				
				// Attach the callback to the multiselect
				multiSelect.data("callback", callback);
				
				// Build the dropdown options
				buildOptions.call(multiSelect);

				// Events
				multiSelect.hover( function() {
					$(this).addClass('hover');
				}, function() {
					$(this).removeClass('hover');
				}).click( function() {
					// Show/hide on click
					if( $(this).hasClass('active') ) {
						$(this).multiSelectOptionsHide();
					} else {
						$(this).multiSelectOptionsShow();
					}
					return false;
				}).focus( function() {
					// So it can be styled with CSS
					$(this).addClass('focus');
				}).blur( function() {
					// So it can be styled with CSS
					$(this).removeClass('focus');
				});
				
				// Add an event listener to the window to close the multiselect if the user clicks off
				$(document).click( function(event) {
					// If somewhere outside of the multiselect was clicked then hide the multiselect
					if(!($(event.target).parents().andSelf().is('.multiSelectOptions'))){
						multiSelect.multiSelectOptionsHide();
					}
				});
			});
		},
		
		// Hide the dropdown
		multiSelectOptionsHide: function() {
      //console.log('multiSelectOptionsHide');
      //console.log($(this));
      if($(this).hasClass('active')){
        $(this).multiSelectOptionsFilter();
        //searchClicked = false;
        //jQuery.OCPsearchClicked = false;
        $('#searchButton').removeClass('clicked');
        //setTimeout('console.log("jQuery.OCPsearchClicked: " + jQuery.OCPsearchClicked); if(!jQuery.OCPsearchClicked) { $(this).multiSelectOptionsFilter(); }', 500);
        //setTimeout("if(!$('#searchButton').hasClass('clicked')) { $(this).multiSelectOptionsFilter(); }", 500);
      }
			$(this).removeClass('active').removeClass('hover').next('.multiSelectOptions').css('visibility', 'hidden');
		},
		
		// Show the dropdown
		multiSelectOptionsShow: function() {
      //console.log('multiSelectOptionsShow');
      //console.log($(this));
			var multiSelect = $(this);
			var multiSelectOptions = multiSelect.next('.multiSelectOptions');
			var o = multiSelect.data("config");
		
			// Hide any open option boxes
			$('.multiSelect').multiSelectOptionsHide();
			multiSelectOptions.find('LABEL').removeClass('hover');
			multiSelect.addClass('active').next('.multiSelectOptions').css('visibility', 'visible');
			multiSelect.focus();
			
			// reset the scroll to the top
			multiSelect.next('.multiSelectOptions').scrollTop(0);

			// Position it
			var offset = multiSelect.position();
			multiSelect.next('.multiSelectOptions').css({ top:  offset.top + $(this).outerHeight() + 'px' });
			multiSelect.next('.multiSelectOptions').css({ left: offset.left + 'px' });
		},
		
		// get a coma-delimited list of selected values
		selectedValuesString: function() {
			var selectedValues = "";
			$(this).next('.multiSelectOptions').find('INPUT:checkbox:checked').not('.optGroup, .selectAll').each(function() {
				selectedValues += $(this).attr('value') + ",";
			});
			// trim any end comma and surounding whitespace
			return selectedValues.replace(/\s*\,\s*$/,'');
		},

		multiSelectOptionsFilter: function() {
      var checked = [];
      //console.log($(this).children());
      //console.log($(this).children().children(':checked'));
      $('.multiSelectOptions').children().children(':checked').each( function () {
          //console.log($(this));
          checked.push(this.name);
      });
      CRM.api("contact",
                 "ajaxpresearch",
                  {
                    version: 3,
                    checked: checked.join(','),
                    org_name: $('#org_name').val()
                  },
                  {
                    success:function(data, settings){
                      //$('#resultsControls').css('visibility', 'hidden');
                      //$("#results").html('');
                      pageNum = 0;
                      //console.log(data.values.where);
                      //console.log(data.values.optionsToHide);

                      if (data.values.count == 1) {
                          $("#restmsg").html('There is 1 matching group.');
                      }
                      else if (data.values.count > 1) {
                          if ($('#org_name').val().length > 0 || checked.length > 0) {
                              $("#restmsg").html('There are ' + data.values.count + ' matching groups.');
                          }
                          else {
                              $("#restmsg").html('');
                          }
                          $('#searchButton').removeAttr('disabled').removeClass('disabledButton');
                      }
                      else {
                          if ($('#org_name').val().length > 5) {
                              $("#restmsg").html('There are no matching groups, try typing fewer letters in the "Search for an organisation by name" field.');
                          }
                          else {
                              $("#restmsg").html('There are no matching groups.');
                          }
                          $('#searchButton').attr('disabled', 1).addClass('disabledButton');
                      }
                      $('.multiSelectOptions').find('INPUT').removeAttr('disabled');
                      $('.multiSelectOptions').find('LABEL').removeClass('disabledOption');
                      $.each(data.values.optionsToHide, function(index, value) {
                          //console.log('optionsToHide ' + index + ': ' + value);
                          checkboxToDisable = $(document.getElementById(value));
                          //console.log(checkboxToDisable);
                          checkboxToDisable.attr('disabled', 1);
                          checkboxToDisable.removeAttr('checked');
                          checkboxToDisable.next('LABEL').addClass('disabledOption');
                      });
                    },
                    ajaxURL: 'civicrm/ajaxsearch/rest'
                  }
                  );
		},

    // Get search results
		multiSelectGetResults: function() {
      var checked = [];
      $('.multiSelectOptions').children().children(':checked').each( function () {
          checked.push(this.name);
      });
      CRM.api("contact",
                 "ajaxsearch",
                  {
                    version: 3,
                    checked: checked.join(','),
                    org_name: $('#org_name').val(),
                    page: pageNum
                  },
                  {
                    success:function(data, settings){
                      resultsText = '<table id="resultsTable"><tr id="resultsHeaderRow"><th id="resultsHeaderName">Organisation Name</th><th id="resultsHeaderWho">Who</th><th id="resultsHeaderWhat">What</th><th id="resultsHeaderWhere">Where</th></tr>\n';
                      $.each(data.values.contacts, function(index, value) {
                          resultsText = resultsText + '<tr class="resultRow"><td><a class="new-window" href="/contacts/view/' + value.id + '">' + value.name + '</a></td><td>' + value.option1 + '</td><td>' + value.option2 + '</td><td>' + value.option3 + '</td></tr>\n';
                      });
                      resultsText = resultsText + '</table>\n';
                      $("#results").html(resultsText);
                      $("#results tr:even").addClass('even');
                      $("#results tr:odd").addClass('odd');
                      $('#results a.new-window').click(function(){
                          window.open(this.href);
                          return false;
                      });
                      $("#results").show();
                      resultsText = 'Showing ' + data.values.num_from + ' to ' + data.values.num_to + ' of ' + data.values.num_total + ' groups.';
                      $("#resultsShowingTop").html(resultsText);
                      $("#resultsShowing").html(resultsText);
                      if (pageNum >= 1) {
                          $('#pagePrevTop').css('visibility', 'visible')
                          $('#pagePrev').css('visibility', 'visible')
                      }
                      else {
                          $('#pagePrevTop').css('visibility', 'hidden')
                          $('#pagePrev').css('visibility', 'hidden')
                      }
                      if (pageNum < data.values.page_total) {
                          $('#pageNextTop').css('visibility', 'visible')
                          $('#pageNext').css('visibility', 'visible')
                      }
                      else {
                          $('#pageNextTop').css('visibility', 'hidden')
                          $('#pageNext').css('visibility', 'hidden')
                      }
                      $('#resultsControlsTop').show();
                      $('#resultsControls').show();
                    },
                    ajaxURL: 'civicrm/ajaxsearch/rest'
                  }
                  );
		},

    displayPCSearchResults: function(wipe) {
      if (wipe) {
        $(this).attr('disabled', 1);
        $("#results").html('');
        $('#resultsControlsTop').hide();
        $('#resultsControls').hide();
      }
      CRM.api(
        "contact",
        "ajaxsearch",
        {
          version: 3,
          postal_code: $(this).val(),
          page: pageNum
        },
        {
          success:function(data, settings){
            if (data.values.num_total > 0) {
              resultsText = '<table id="resultsTable"><tr id="resultsHeaderRow"><th id="resultsHeaderName">Organisation Name</th><th id="resultsHeaderPostcode">Postcode</th><th id="resultsHeaderWho">Who</th><th id="resultsHeaderWhat">What</th><th id="resultsHeaderWhere">Where</th></tr>\n';
              $.each(data.values.contacts, function(index, value) {
                  resultsText = resultsText + '<tr class="resultRow"><td><a class="new-window" href="/contacts/view/' + value.id + '">' + value.name + '</a></td><td>' + value.postal_code + '</td><td>' + value.option1 + '</td><td>' + value.option2 + '</td><td>' + value.option3 + '</td></tr>\n';
              });
              resultsText = resultsText + '</table>\n';
              $("#results").html(resultsText);
              $("#results tr:even").addClass('even');
              $("#results tr:odd").addClass('odd');
              $('#results a.new-window').click(function(){
                  window.open(this.href);
                  return false;
              });
              resultsText = 'Postcode Search: showing ' + data.values.num_from + ' to ' + data.values.num_to + ' of ' + data.values.num_total + ' groups.';
              $("#resultsShowingTop").html(resultsText);
              $("#resultsShowing").html(resultsText);
              if (pageNum >= 1) {
                  $('#pagePrevTop').css('visibility', 'visible')
                  $('#pagePrev').css('visibility', 'visible')
              }
              else {
                  $('#pagePrevTop').css('visibility', 'hidden')
                  $('#pagePrev').css('visibility', 'hidden')
              }
              if (pageNum < data.values.page_total) {
                  $('#pageNextTop').css('visibility', 'visible')
                  $('#pageNext').css('visibility', 'visible')
              }
              else {
                  $('#pageNextTop').css('visibility', 'hidden')
                  $('#pageNext').css('visibility', 'hidden')
              }
              $('#resultsControlsTop').show();
              $('#resultsControls').show();
            }
            else {
              $("#results").html('Sorry, no postcode matches found.');
            }
            $("#results").show();
            $('#postal_code').removeAttr('disabled');
          },
          ajaxURL: 'civicrm/ajaxsearch/rest'
        }
      );
    },

	displayCCGSearchResults: function(wipe) {

      if (wipe) {
        $(this).attr('disabled', 1);
        $("#results").html('');
        $('#resultsControlsTop').hide();
        $('#resultsControls').hide();
      }
	  // Get selected results as some kind of seperated string
	  var ccgSelectedValues = [];
	  
	  $('#options_ccg input:checkbox:checked').each(function() {
		ccgSelectedValues.push(this.name);
	   });
	   
	  var ccgSelection = ccgSelectedValues.join('#');
	  
	   CRM.api(
        "contact",
        "ajaxsearch",
        {
          version: 3,
          ccg_search: ccgSelection,
          page: pageNum
        },
        {
          success:function(data, settings){
            if (data.values.num_total > 0) {
              resultsText = '<table id="resultsTable"><tr id="resultsHeaderRow"><th id="resultsHeaderName">Organisation Name</th><th id="resultsHeaderPostcode">Postcode</th><th id="resultsHeaderWho">Who</th><th id="resultsHeaderWhat">What</th><th id="resultsHeaderWhere">Where</th></tr>\n';
              $.each(data.values.contacts, function(index, value) {
                  resultsText = resultsText + '<tr class="resultRow"><td><a class="new-window" href="/contacts/view/' + value.id + '">' + value.name + '</a></td><td>' + value.postal_code + '</td><td>' + value.option1 + '</td><td>' + value.option2 + '</td><td>' + value.option3 + '</td></tr>\n';
              });
              resultsText = resultsText + '</table>\n';
              $("#results").html(resultsText);
              $("#results tr:even").addClass('even');
              $("#results tr:odd").addClass('odd');
              $('#results a.new-window').click(function(){
                  window.open(this.href);
                  return false;
              });
              resultsText = 'Postcode Search: showing ' + data.values.num_from + ' to ' + data.values.num_to + ' of ' + data.values.num_total + ' groups.';
              $("#resultsShowingTop").html(resultsText);
              $("#resultsShowing").html(resultsText);
              if (pageNum >= 1) {
                  $('#pagePrevTop').css('visibility', 'visible')
                  $('#pagePrev').css('visibility', 'visible')
              }
              else {
                  $('#pagePrevTop').css('visibility', 'hidden')
                  $('#pagePrev').css('visibility', 'hidden')
              }
              if (pageNum < data.values.page_total) {
                  $('#pageNextTop').css('visibility', 'visible')
                  $('#pageNext').css('visibility', 'visible')
              }
              else {
                  $('#pageNextTop').css('visibility', 'hidden')
                  $('#pageNext').css('visibility', 'hidden')
              }
              $('#resultsControlsTop').show();
              $('#resultsControls').show();
            }
            else {
              $("#results").html('Sorry, no postcode matches found.');
            }
            $("#results").show();
            $('#postal_code').removeAttr('disabled');
          },
          ajaxURL: 'civicrm/ajaxsearch/rest'
        }
      );
	  
	  
	  
	  
	},
		
	
    displayKeywordSearchResults: function(wipe) {
      if (wipe) {
        $(this).attr('disabled', 1);
        $("#results").html('');
        $('#resultsControlsTop').hide();
        $('#resultsControls').hide();
      }
      CRM.api(
        "contact",
        "ajaxsearch",
        {
          version: 3,
          keyword: $(this).val(),
          page: pageNum
        },
        {
          success:function(data, settings){
            if (data.values.num_total > 0) {
              resultsText = '<table id="resultsTable"><tr id="resultsHeaderRow"><th id="resultsHeaderName">Organisation Name</th><th id="resultsHeaderWho">Who</th><th id="resultsHeaderWhat">What</th><th id="resultsHeaderWhere">Where</th></tr>\n';
              $.each(data.values.contacts, function(index, value) {
                  resultsText = resultsText + '<tr class="resultRow"><td><a class="new-window" href="/contacts/view/' + value.id + '">' + value.name + '</a></td><td>' + value.option1 + '</td><td>' + value.option2 + '</td><td>' + value.option3 + '</td></tr>\n';
              });
              resultsText = resultsText + '</table>\n';
              $("#results").html(resultsText);
              $("#results tr:even").addClass('even');
              $("#results tr:odd").addClass('odd');
              $('#results a.new-window').click(function(){
                  window.open(this.href);
                  return false;
              });
              resultsText = 'Keyword Search: showing ' + data.values.num_from + ' to ' + data.values.num_to + ' of ' + data.values.num_total + ' groups.';
              $("#resultsShowingTop").html(resultsText);
              $("#resultsShowing").html(resultsText);
              if (pageNum >= 1) {
                  $('#pagePrevTop').css('visibility', 'visible')
                  $('#pagePrev').css('visibility', 'visible')
              }
              else {
                  $('#pagePrevTop').css('visibility', 'hidden')
                  $('#pagePrev').css('visibility', 'hidden')
              }
              if (pageNum < data.values.page_total) {
                  $('#pageNextTop').css('visibility', 'visible')
                  $('#pageNext').css('visibility', 'visible')
              }
              else {
                  $('#pageNextTop').css('visibility', 'hidden')
                  $('#pageNext').css('visibility', 'hidden')
              }
              $('#resultsControlsTop').show();
              $('#resultsControls').show();
            }
            else {
              $("#results").html('Sorry, no keyword matches found.');
            }
            $("#results").show();
            $('#keyword').removeAttr('disabled');
          },
          ajaxURL: 'civicrm/ajaxsearch/rest'
        }
      );
    }

	});
	
	// add a new ":startsWith" search filter
	$.expr[":"].startsWith = function(el, i, m) {
		var search = m[3];        
		if (!search) return false;
		return eval("/^[/s]*" + search + "/i").test($(el).text());
	};

})(jQuery);
