<?php

/**
 * Include common API util functions
 */
require_once 'api/v3/utils.php';
require_once 'CRM/Core/DAO.php';
require_once 'CRM/Core/BAO/CustomField.php';
require_once 'AJAXSearch/Form/Search.php';

/*
 * Given a set of checked custom field options, return matching contacts.
 *
 * @return array of matching contacts.
 */
function civicrm_api3_contact_ajaxsearch( &$params ) {
    civicrm_api3_verify_mandatory($params);
    $limitNum = 20;
    $limitFrom = intval($params['page']) * $limitNum;
    $fieldInfo = AJAXSearch_Form_Search::optionFieldInfo();
    $queryInfo = AJAXSearch_Form_Search::queryInfo($params);
    if (!$queryInfo['configured']) {
        return civicrm_api3_create_error('This search facility has not been configured');
    }

    $where         = $queryInfo['where'];
    $aclSelect     = $queryInfo['aclSelect'];
    $aclFrom       = $queryInfo['aclFrom'];
    $orderBy       = $queryInfo['orderBy'];
    $addressFrom   = $queryInfo['addressFrom'];
    $tableNames    = $queryInfo['tables'];
    #$tableNames    = array();
    $select = 'SELECT SQL_CALC_FOUND_ROWS c.id, c.display_name';
    if ($aclSelect) {
        $select .= ', ' . $aclSelect;
    }
    // Make sure all the multi-select fields' tables are included, as we need
    // them for display.
    foreach ($fieldInfo as $id => $field) {
        $tableNames[$field['table_name']] = TRUE;
        $select .= ', ' . $field['table_name'] . '.' . $field['column_name'];
    }

    $from = 'FROM civicrm_contact c';
    foreach (array_keys($tableNames) as $tableName) {
        $from .= " LEFT OUTER JOIN $tableName ON c.id = $tableName.entity_id";
    }

    if ($addressFrom) {
      $select .= ', a.postal_code';
    }

    $searchQuery = "
$select
$from
$aclFrom
$addressFrom
$where
$orderBy
LIMIT $limitFrom, $limitNum";

CRM_Core_Error::debug_log_message( "searchquery: ".print_r($searchQuery, TRUE) );

    $dao = CRM_Core_DAO::executeQuery( $searchQuery );
    $results = array();
    while ( $dao->fetch() ) {
        $result = array(
            'id' => $dao->id,
            'name' => $dao->display_name,
        );
        foreach (AJAXSearch_Form_Search::optionFields() as $index => $fieldID) {
            #$result["option$index"] = str_replace(chr(1), ', ', substr($dao->$fieldInfo[$fieldID]['column_name'], 1, -1));
            $displayValue = CRM_Core_BAO_CustomField::getDisplayValueCommon(
                $dao->$fieldInfo[$fieldID]['column_name'],
                $fieldInfo[$fieldID]['options'],
                $fieldInfo[$fieldID]['html_type'],
                $fieldInfo[$fieldID]['data_type']
            );
            $result["option$index"] = ($displayValue === null ? '' : $displayValue);
        }
        if ($addressFrom) {
          $result['postal_code'] = $dao->postal_code;
        }
        $results[] = $result;
    }

    $totalRows   = CRM_Core_DAO::singleValueQuery( "SELECT FOUND_ROWS();" );

    $returnValues = array();
    $returnValues['contacts']    = $results;
    $returnValues['num_from']    = $limitFrom + 1;
    $returnValues['num_to']      = min($limitFrom + $limitNum, $totalRows);
    $returnValues['num_total']   = $totalRows;
    $returnValues['page_total']  = intval($totalRows / $limitNum);
    #$returnValues['query']       = $searchQuery; // For debugging
    $returnValues['is_error']    = 0;

    return civicrm_api3_create_success( $returnValues, $params, 'contact', 'ajaxsearch');
}
