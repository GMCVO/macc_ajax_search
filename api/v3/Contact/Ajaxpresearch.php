<?php

/**
 * Include common API util functions
 */
require_once 'api/v3/utils.php';
require_once 'CRM/Core/DAO.php';
require_once 'CRM/Core/BAO/CustomField.php';
require_once 'AJAXSearch/Form/Search.php';

/*
 * Given a set of checked custom field options, find how many contacts match
 * the search and which options in other fields would return no results in
 * conjunction with these.
 */
function civicrm_api3_contact_ajaxpresearch( $params ) {
    civicrm_api3_verify_mandatory($params);
    $fieldInfo = AJAXSearch_Form_Search::optionFieldInfo();
    $queryInfo = AJAXSearch_Form_Search::queryInfo($params);
    if (!$queryInfo['configured']) {
        return civicrm_api3_create_error('This search facility has not been configured');
    }

    $checkedValues = $queryInfo['checked'];
    $where         = $queryInfo['where'];
    $tableNames    = $queryInfo['tables'];
    $aclFrom       = $queryInfo['aclFrom'];
    $returnValues = array();

    // TODO is $dao->N more efficient than COUNT() ?
    $from = 'FROM civicrm_contact c';
    foreach (array_keys($tableNames) as $tableName) {
        $from .= " LEFT OUTER JOIN $tableName ON c.id = $tableName.entity_id";
    }
    $searchQuery = "SELECT COUNT(*) $from $aclFrom $where";
    $returnValues['query']       = $searchQuery; // For debugging
    $count = CRM_Core_DAO::singleValueQuery( $searchQuery );

    $populatedValues = array();
    $optionsToHide = array();

    // For the fields that don't have any options checked,
    // find the unpopulated options.
    foreach (AJAXSearch_Form_Search::optionFields() as $updateFieldIndex => $updateFieldID) {

        if (!empty($checkedValues[$updateFieldIndex])) {
            continue;
        }

        $fieldName = $fieldInfo[$updateFieldID]['column_name'];
        $tableName = $fieldInfo[$updateFieldID]['table_name'];

        $updateTableNames = $tableNames;
        $updateTableNames[$tableName] = TRUE;
        $from = 'FROM civicrm_contact c';
        foreach (array_keys($updateTableNames) as $tableName) {
            $from .= " INNER JOIN $tableName ON c.id = $tableName.entity_id";
        }

        $searchQuery = "
SELECT DISTINCT $fieldName value
$from
$aclFrom
$where AND $fieldName IS NOT NULL";
        $dao = CRM_Core_DAO::executeQuery( $searchQuery );
        while ( $dao->fetch() ) {
            $values = explode(chr(1), $dao->value);
            foreach ( $values as $value ) {
                if ( $value != '' ) {
                    $populatedValues[$value] = TRUE;
                }
            }
        }

        // Iterate through all option values for the field we're updating,
        // storing the unpopulated ones in $optionsToHide.
        $optionGroupID = $fieldInfo[$updateFieldID]['option_group_id'];
        $fieldQuery = "SELECT value FROM civicrm_option_value WHERE option_group_id = %1";
        $fieldParams = array( 1 => array( $optionGroupID , 'Integer' ) );
        $dao = CRM_Core_DAO::executeQuery( $fieldQuery, $fieldParams );
        while ( $dao->fetch() ) {
            if ( empty($populatedValues[$dao->value]) ) {
                $optionsToHide[] = 'option' . ($updateFieldIndex) . '_id[' . $dao->value . ']';
            }
        }
    }

    #$returnValues['checked']   = $params['checked'];
    #$returnValues['where']     = $where;
    $returnValues['count']     = $count;
    #$returnValues['populatedValues']     = $populatedValues;
    $returnValues['optionsToHide']     = $optionsToHide;
    $returnValues['is_error']  = 0;

    return civicrm_api3_create_success( $returnValues, $params, 'contact', 'ajaxpresearch');
}
