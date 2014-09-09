CiviCRM AJAX Search

Description
Alternative to CiviCRM profile search, using AJAX to disable options that would return no results.

Installation

On server:
1. Copy civicrm_ajax_search/ into sites/my.site/modules/ .
2. Copy search.css into theme directory & add to theme info file.
3. Copy dropdown.blue.png, dropdown.blue.active.png and dropdown.blue.hover.png into images/ under theme directory.
4. Copy views templates into theme directory: views-view-field--civi-public-search.tpl.php, views-view-field--civi-public-search--block-2--geo-code-2.tpl.php (+ check if any others).
5. Make sure $db_prefix is set correctly for civicrm tables in settings.php .
6. In web server virtual host config, add alias /images for above directory (or amend paths to /images/dropdown.blue.png etc in search.css to e.g. /sites/my.site/themes/mytheme/images/dropdown.blue.png).
7. Patch sites/all/modules/civicrm/drupal/modules/views/civicrm.views.inc with patch from CRM-8487, for supplemental_address_2 support, unless already fixed in the Civi version in use (hope patch will be committed in 3.4.5).
8. Export & import Views: civi_public_search + map.
9. Configure blocks to display on contacts/view/N: contact details & map.

In UI:
10. Enable civicrm_ajax_search module.
11. At /admin/settings/civicrm_ajax_search, select the Civi custom fields to be used for Who, What, Where, Is Public and Hide Address.
12. Test search at civicrm/ajaxsearch/search.