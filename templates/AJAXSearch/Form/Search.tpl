<div class="form-item">
    <div id="searchForm" class="form-item">
      <table id="searchTable" class="form-layout">
        <tr id="searchRow">
           <!--<td id="searchNameLabel" rowspan="2">{$form.org_name.label}</td>-->
           <td id="searchName"><label>{ts}Name{/ts}</label><br />{$form.org_name.html}</td>
           <td id="searchWho"><label>{ts}Who do they work with?{/ts}</label><br />
              <a href="javascript:;" class="multiSelect" id="multiSelect1"><span></span></a>
              <div id="options1" class="multiSelectOptions" style="position: absolute; z-index: 99999; visibility: hidden;">
                {foreach from=$form.option1_id item="option_val"} 
                   <div class="{cycle values="odd-row,even-row"}">
                     {$option_val.html}
                   </div>
                {/foreach}
              </div>
           </td>
           <td id="searchWhat"><label>{ts}What do they do?{/ts}</label><br />
              <a href="javascript:;" class="multiSelect" id="multiSelect2"><span></span></a>
              <div id="options2" class="multiSelectOptions" style="position: absolute; z-index: 99999; visibility: hidden;">
                {foreach from=$form.option2_id item="option_val"} 
                   <div class="{cycle values="odd-row,even-row"}">
                     {$option_val.html}
                   </div>
                {/foreach}
              </div>
           </td>
           <td id="searchWhere"><label>{ts}Where do they work?{/ts}</label><br />
              <a href="javascript:;" class="multiSelect" id="multiSelect3"><span></span></a>
              <div id="options3" class="multiSelectOptions" style="position: absolute; z-index: 99999; visibility: hidden;">
                {foreach from=$form.option3_id item="option_val"} 
                   <div class="{cycle values="odd-row,even-row"}">
                     {$option_val.html}
                   </div>
                {/foreach}
              </div>
           </td>
        </tr>
        <tr id="searchButtonRow">
          <td id="searchButtonTD" colspan="5">
            {if $bannerText}
            <span id="bannerText">{$bannerText}</span>
            {/if}
            <span id="clearSearch"><a href="/{$path}">Clear Search</a></span>
            <input type="button" name="Search" id="searchButton" value="Search">
            <span id="restmsg"></span>
          </td>
        </tr>
      </table>
    </div>
    {if $form.postal_code}
      <div id="postcodeSearchForm" class="form-item">
        <label>{$form.postal_code.label}</label>
        {if $postCodeHelp}
          <span id="postCodeHelp">{$postCodeHelp}</span>
        {/if}
        <br />{$form.postal_code.html}
        <input type="button" name="Search" id="postcodeSearchButton" value="Search">
      </div>
    {/if}
    {if $form.keyword}
      <div id="keywordSearchForm" class="form-item">
        <label>{$form.keyword.label}</label><br />{$form.keyword.html}
        <input type="button" name="Search" id="keywordSearchButton" value="Search">
      </div>
    {/if}
	
	<div id="ccgSearchForm">
		<label>CCG Search</label><br />
		<a href="javascript:;" class="multiSelect" id="multiSelect_ccg"><span>CCG Search</span></a>
		<div id="options_ccg" class="multiSelectOptions" style="position: absolute; z-index: 99999; visibility: hidden;">
			{foreach from=$form.option_ccg_id item="option_val"} 
				<div class="{cycle values="odd-row,even-row"}">
                    {$option_val.html}
                </div>
            {/foreach}
        </div>
		<input type="button" name="Search" id="ccgSearchButton" value="Search">
	</div>	   

	
    <div id="searchResults" class="form-item">
      <div id="resultsControlsTop" style="display:none;">
        <span class="print-view"><a href="javascript:window.print()"><img src="/images/print_icon.gif" alt="Click here to print this page" /></a></span>
        <span id="resultsShowingTop"></span>
        <span id="resultsPrevNextTop">
          <a href="javascript:void(0);" id="pageNextTop">Next</a>
          <a href="javascript:void(0);" id="pagePrevTop">Previous</a>
        </span>
      </div>
      <div id="results" style="display:none;"></div>
      <div id="resultsControls" style="display:none;">
        <span class="print-view"><a href="javascript:window.print()"><img src="/images/print_icon.gif" alt="Click here to print this page" /></a></span>
        <span id="resultsShowing"></span>
        <span id="resultsPrevNext">
          <a href="javascript:void(0);" id="pageNext">Next</a>
          <a href="javascript:void(0);" id="pagePrev">Previous</a>
        </span>
      </div>
    </div>
    
    <div class="spacer"></div>
</div>

{literal}
<script type="text/javascript">
(function ($) {

function getContactDetails(id) {
  CRM.api("ajaxsearch",
              "details",
              {
                id: id
              },
              {
                success:function(result, settings){
                  resultsText = '<table>\n';
                  //resultsText = '<div class="crm-tooltip-wrapper"><div class="crm-tooltip"><div class="crm-summary-group"><table>\n';
                  resultsText = resultsText + '<tr><td>' + result.contact.name + '</td><td>' + result.contact.option1 + '</td><td>' + result.contact.option2 + '</td><td>' + result.contact.option3 + '</td></tr>\n';
                  resultsText = resultsText + '</table>\n';
                  //resultsText = resultsText + '</table></div></div></div>\n';
                  $("#results").after(resultsText);
                },
                ajaxURL: '/civicrm/ajaxsearch/rest'
              }
              );
}

$('#org_name').bind('keypress', function(e) {
          if (e.which == 13) {
            searchMode = 'main';
            $('#searchButton').addClass('clicked');
            $(this).multiSelectGetResults();
          }
        }).bind('change mouseleave', function() {
          //searchClicked = false;
          //setTimeout('if(!searchClicked) { $(this).multiSelectOptionsFilter(); }', 500);
          $(this).multiSelectOptionsFilter();
        }).bind('click focus', function() {
          $(this).addClass('bg-image-cleared');
        });

$(document).ready(function() {
          $('#Search').submit( function() {
            return false;
          });
          $('#multiSelect1').multiSelect({noneSelected: 'Select target audience'});
          $('#multiSelect2').multiSelect({noneSelected: 'Select area of work'});
          $('#multiSelect3').multiSelect({noneSelected: 'Select locality'});
		  $('#multiSelect_ccg').multiSelect({noneSelected: 'CCG Search'});
		  
          $(this).multiSelectOptionsFilter();
          pageNum = 0;
          {/literal}
          {if $force}
          {literal}
            $(this).multiSelectGetResults();
          {/literal}
          {/if}
          {literal}
        });

$('#searchButton').mouseenter( function() {
          $(this).multiSelectOptionsFilter();
        }).click( function() {
          //searchClicked = true;
          //jQuery.OCPsearchClicked = true;
          searchMode = 'main';
          $(this).addClass('clicked');
          $(this).multiSelectGetResults();
        });

$('#pagePrev, #pagePrevTop').click( function() {
          if (pageNum >= 1) {
            pageNum--;
            if (searchMode == 'postcode') {
              $('#postal_code').displayPCSearchResults(false);
            }
            else if (searchMode == 'keyword') {
              $('#keyword').displayKeywordSearchResults(false);
            }
			 else if (searchMode == 'ccg') {
              $('#ccgOptions').displayCCGSearchResults(false);
            }
			else {
              $(this).multiSelectGetResults();
            }
          }
          //if (pageNum < 1) {
          //  $(this).attr('disabled', 1);
          //  $(this).attr('innerHTML', '(Previous)');
          //}
        });

$('#pageNext, #pageNextTop').click( function() {
          pageNum++;
          if (searchMode == 'postcode') {
            $('#postal_code').displayPCSearchResults(false);
          }
          else if (searchMode == 'keyword') {
            $('#keyword').displayKeywordSearchResults(false);
          }
		  else if (searchMode == 'ccg') {
            $('#ccgOptions').displayCCGSearchResults(false);
          }
          else {
            $(this).multiSelectGetResults();
          }
          //$('#pagePrev').removeAttr('disabled');
          //$('#pagePrev').attr('innerHTML', 'Previous');
        });

$('#postal_code').bind('keypress', function(e) {
          if (e.which == 13) {
            if ($(this).val() == '') {
              alert('Please enter a postcode.');
            }
            else {
              searchMode = 'postcode';
              pageNum = 0;
              $(this).displayPCSearchResults(true);
            }
          }
        });

$('#postcodeSearchButton').click( function() {
          if ($('#postal_code').val() == '') {
            alert('Please enter a postcode.');
          }
          else {
            $(this).addClass('clicked');
            searchMode = 'postcode';
            pageNum = 0;
            $('#postal_code').displayPCSearchResults(true);
          }
        });

$('#keyword').bind('keypress', function(e) {
          if (e.which == 13) {
            if ($(this).val() == '') {
              alert('Please enter a keyword.');
            }
            else {
              searchMode = 'keyword';
              pageNum = 0;
              $(this).displayKeywordSearchResults(true);
            }
          }
        });

$('#ccgSearchButton').click( function() {
    $(this).addClass('clicked');
    searchMode = 'ccg';
    pageNum = 0;
    $('#ccgOptions').displayCCGSearchResults(true);
});		
		
		
$('#keywordSearchButton').click( function() {
          if ($('#keyword').val() == '') {
            alert('Please enter a keyword.');
          }
          else {
            $(this).addClass('clicked');
            searchMode = 'keyword';
            pageNum = 0;
            $('#keyword').displayKeywordSearchResults(true);
          }
        });

}(jQuery));
</script>
{/literal}

