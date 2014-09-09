<?php

require_once 'CRM/Core/Form.php';
require_once 'CRM/Core/BAO/CustomOption.php';

class AJAXSearch_Form_Search extends CRM_Core_Form {

    /**
     * Custom field ids of the primary, secondary & tertiary checkbox fields.
     * 
     * @var array 
     * @access public
     */ 
    private static $_optionFields;

    /**
     * Custom field info for the primary, secondary & tertiary checkbox fields.
     * 
     * @var array 
     * @access private
     */ 
    private static $_optionFieldInfo;

    /**
     * Limit search results to members of this static group.
     * 
     * @var array 
     * @access public
     */ 
    private static $_limitListingsGroupID = null;

    /**
     * Limit search results to records where this Boolean custom field is true.
     * 
     * @var array 
     * @access public
     */ 
    private static $_publicFieldInfo = null;

    /**
     * Is the record approved for public view?
     * - Also limit search results to records where this Boolean custom field is true,
     * if the field is configured.
     * 
     * @var array 
     * @access public
     */
    private static $_approvedFieldInfo = null;

    /**
     * Hide address of records where this Boolean custom field is true.
     * 
     * @var array 
     * @access public
     */ 
    private static $_hideAddressFieldInfo = null;

    /**
     * Info about field to search for keywords.
     * 
     * @var array 
     * @access public
     */ 
    private static $_keywordFieldInfo = null;

    function buildQuickForm( ) {
        CRM_Utils_System::setTitle( 'Search' );

        $force    = CRM_Utils_Request::retrieve( 'force',    'String', $this );
        $org_name = CRM_Utils_Request::retrieve( 'org_name', 'String', $this );
        $postcode_search = variable_get('civicrm_ajax_search_postcode_search', FALSE);
        $keyword_search  = variable_get('civicrm_ajax_search_keyword_search', FALSE);
        $defaults = array();

        $this->add( 'text',
                    'org_name',
                    ts( 'Search' ),
                    'autocomplete="off"',
                    false );

        if (!empty($org_name)) {
            $defaults['org_name'] = $org_name;
        }

        foreach ( self::optionFields() as $i => $field_id ) {
            // Based on CRM_Core_BAO_CustomField::addQuickFormElement case 'CheckBox'
            // and CRM_Activity_BAO_Query::buildSearchForm activityOptions.
            $customOption = CRM_Core_BAO_CustomOption::valuesByID( $field_id );
            foreach ($customOption as $value => $label) {
                $val = "option{$i}_id[$value]";
                $this->addElement( 'checkbox', $val, null, $label );
            }
            if ( $selectedOptions = CRM_Utils_Array::value("option{$i}_id", $_GET) ) {
                foreach ($selectedOptions as $value => $checked) {
                    if ($checked) {
                        $defaults["option{$i}_id[$value]"] = 1;
                    }
                }
            }
        }

        if ($postcode_search) {
          $this->add( 'text',
                      'postal_code',
                      ts('Postcode'),
                      'autocomplete="off"',
                      false );
        }

        if ($keyword_search) {
          $this->add( 'text',
                      'keyword',
                      ts('Keyword Search'),
                      'autocomplete="off"',
                      false );
        }

        $this->addDefaultButtons( 'AJAX Search', 'next', null, true );
        $this->assign('force',          $force);
        $this->assign('orgName',        $org_name);
        $this->assign('path',           $_GET['q']);
        $this->assign('bannerText',     variable_get('civicrm_ajax_search_banner_text', ''));
        $this->assign('postCodeHelp',   variable_get('civicrm_ajax_search_postcode_help_text', ''));
        $this->setDefaults($defaults);

        // Group, weight & scope must be the same as used in civicrm_html_head
        // for js files in CRM/common/jquery.files.tpl
        drupal_add_js(
            drupal_get_path('module', 'civicrm_ajax_search' ) . '/js/civiAjaxMultiSelect.js',
            array('group' => JS_LIBRARY, 'weight' => 10, 'scope' => 'header')
        );
    }

    /**
     * Get custom field ids for the primary, secondary & tertiary checkbox fields.
     *
     * @access public
     * @return array - array reference of Custom field ids as index => id.
     * @static
     */
    public static function &optionFields( $id = null ) {
        if ( ! self::$_optionFields ) {
            self::$_optionFields = array(
                1 => variable_get('civicrm_ajax_search_select_multi1', 0),
                2 => variable_get('civicrm_ajax_search_select_multi2', 0),
                3 => variable_get('civicrm_ajax_search_select_multi3', 0),
            );
        }

        if( $id ) {
            return self::$_optionFields[$id];
        }

        return self::$_optionFields;
    }

    /**
     * Get custom field info for the primary, secondary & tertiary checkbox fields.
     *
     * @access public
     * @return array - array reference of Custom field info.
     * @static
     */
    public static function &optionFieldInfo( $id = null ) {
        if ( ! self::$_optionFieldInfo ) {
            self::$_optionFieldInfo = array( );
            $id2index = array_flip(self::optionFields());
            // Get custom field info.
            $fieldQuery = '
SELECT f.id, f.column_name, f.option_group_id, f.html_type, f.data_type, g.table_name
FROM civicrm_custom_field f
INNER JOIN civicrm_custom_group g ON f.custom_group_id = g.id
WHERE f.id IN (' . implode(',', array_values(self::optionFields())) . ')';
            $dao = CRM_Core_DAO::executeQuery( $fieldQuery );
            while ( $dao->fetch() ) {
                self::$_optionFieldInfo[$dao->id] = array(
                    'column_name'     => $dao->column_name,
                    'option_group_id' => $dao->option_group_id,
                    'table_name'      => $dao->table_name,
                    'html_type'       => $dao->html_type,
                    'data_type'       => $dao->data_type,
                    'index'           => $id2index[$dao->id],
                );
            }
            foreach ( self::$_optionFieldInfo as $fieldId => $info ) {
                if ( $info['option_group_id'] ) {
                    // Get option values.
                    $optionQuery = '
SELECT label, value
FROM civicrm_option_value
WHERE option_group_id = ' . $info['option_group_id'];

                    $option = CRM_Core_DAO::executeQuery( $optionQuery );
                    while ( $option->fetch( ) ) {
                        $dataType = $info['data_type'];
                        if ( $dataType == 'Int' || $dataType == 'Float' ) {
                            $num = round($option->value, 2);
                            self::$_optionFieldInfo[$fieldId]['options']["$num"] = $option->label;
                        } else {
                            self::$_optionFieldInfo[$fieldId]['options'][$option->value] = $option->label;
                        }
                    }
                }
            }
            #error_log("_optionFieldInfo: " . print_r(self::$_optionFieldInfo, TRUE) . "\n", 3, '/tmp/ocp-log');
        }
        
        if( $id ) {
            return self::$_optionFieldInfo[$id];
        }

        return self::$_optionFieldInfo;
    }

    /**
     * Get custom field info for the public/private field.
     *
     * @access public
     * @return array - array reference of Custom field info.
     * @static
     */
    public static function &publicFieldInfo() {
        if ( ! self::$_publicFieldInfo ) {
            $fieldID = variable_get('civicrm_ajax_search_select_public', 0);
            if ($fieldID) {
                $query = '
SELECT f.column_name, g.table_name
FROM civicrm_custom_field f
INNER JOIN civicrm_custom_group g ON f.custom_group_id = g.id
WHERE f.id = %1';
                $params = array( 1 => array( $fieldID, 'Integer' ) );
                $dao = CRM_Core_DAO::executeQuery( $query, $params );
                if ( $dao->fetch() ) {
                    self::$_publicFieldInfo = array(
                        'id'          => $fieldID,
                        'column_name' => $dao->column_name,
                        'table_name'  => $dao->table_name,
                    );
                }
            }
        }
        #CRM_Core_Error::debug_log_message( "publicFieldInfo: returning: " . print_r(self::$_publicFieldInfo, TRUE));

        return self::$_publicFieldInfo;
    }

    /**
     * Get custom field info for the approved field.
     *
     * @access public
     * @return array - array reference of Custom field info.
     * @static
     */
    public static function &approvedFieldInfo() {
        if ( ! self::$_approvedFieldInfo ) {
            $fieldID = variable_get('civicrm_ajax_search_select_approved', 0);
            if ($fieldID) {
                $query = '
SELECT f.column_name, g.table_name
FROM civicrm_custom_field f
INNER JOIN civicrm_custom_group g ON f.custom_group_id = g.id
WHERE f.id = %1';
                $params = array( 1 => array( $fieldID, 'Integer' ) );
                $dao = CRM_Core_DAO::executeQuery( $query, $params );
                if ( $dao->fetch() ) {
                    self::$_approvedFieldInfo = array(
                        'id'          => $fieldID,
                        'column_name' => $dao->column_name,
                        'table_name'  => $dao->table_name,
                    );
                }
            }
        }
        #CRM_Core_Error::debug_log_message( "approvedFieldInfo: returning: " . print_r(self::$_approvedFieldInfo, TRUE));

        return self::$_approvedFieldInfo;
    }

    /**
     * Get custom field info for the hide address field.
     *
     * @access public
     * @return array - array reference of Custom field info.
     * @static
     */
    public static function &hideAddressFieldInfo() {
        if ( ! self::$_hideAddressFieldInfo ) {
            $fieldID = variable_get('civicrm_ajax_search_select_hide_address', 0);
            if ($fieldID) {
                $query = '
SELECT f.column_name, g.table_name
FROM civicrm_custom_field f
INNER JOIN civicrm_custom_group g ON f.custom_group_id = g.id
WHERE f.id = %1';
                $params = array( 1 => array( $fieldID, 'Integer' ) );
                $dao = CRM_Core_DAO::executeQuery( $query, $params );
                if ( $dao->fetch() ) {
                    self::$_hideAddressFieldInfo = array(
                        'id'          => $fieldID,
                        'column_name' => $dao->column_name,
                        'table_name'  => $dao->table_name,
                    );
                }
            }
        }
        #CRM_Core_Error::debug_log_message( "hideAddressFieldInfo: returning: " . print_r(self::$_hideAddressFieldInfo, TRUE));

        return self::$_hideAddressFieldInfo;
    }

    /**
     * Get custom field info for the keyword field.
     *
     * @access public
     * @return array - array reference of Custom field info.
     * @static
     */
    public static function &keywordFieldInfo() {
        if ( ! self::$_keywordFieldInfo ) {
            $fieldID = variable_get('civicrm_ajax_search_keyword_field', 0);
            if ($fieldID) {
                $query = '
SELECT f.column_name, g.table_name
FROM civicrm_custom_field f
INNER JOIN civicrm_custom_group g ON f.custom_group_id = g.id
WHERE f.id = %1';
                $params = array( 1 => array( $fieldID, 'Integer' ) );
                $dao = CRM_Core_DAO::executeQuery( $query, $params );
                if ( $dao->fetch() ) {
                    self::$_keywordFieldInfo = array(
                        'id'          => $fieldID,
                        'column_name' => $dao->column_name,
                        'table_name'  => $dao->table_name,
                    );
                }
            }
        }
        #CRM_Core_Error::debug_log_message( "keywordFieldInfo: returning: " . print_r(self::$_keywordFieldInfo, TRUE));

        return self::$_keywordFieldInfo;
    }

    /**
     * Generate WHERE clause & list of tables based on params.
     *
     * @access public
     * @return array containing SQL WHERE clause & array of table names.
     * @static
     */
    public static function queryInfo( $params ) {
        $checkedValues = array();
        $whereClauses = array();
        $tableNames = array();
        $fieldInfo = AJAXSearch_Form_Search::optionFieldInfo();

        // Access control: restrict to records where public booolean field set.
        $publicFieldInfo = self::publicFieldInfo();
        if ($publicFieldInfo) {
            $fieldName = $publicFieldInfo['column_name'];
            $tableName = $publicFieldInfo['table_name'];
            $tableNames[$tableName] = TRUE;
            $whereClauses[] = "$fieldName = 1";
        }
        else {
            // Safety check so we don't expose contacts that shouldn't be public.
            return array (
                'configured' => FALSE,
            );
        }

        // Access control: restrict to records where approved boolean field set,
        // if this field is configured.
        $approvedFieldInfo = self::approvedFieldInfo();
        if ($approvedFieldInfo) {
            $fieldName = $approvedFieldInfo['column_name'];
            $tableName = $approvedFieldInfo['table_name'];
            $tableNames[$tableName] = TRUE;
            $whereClauses[] = "$fieldName = 1";
        }

        // Access control: include Hide Address boolean field
        // so that display code can hide addresses.
        $hideAddressFieldInfo = self::hideAddressFieldInfo();
        if ($hideAddressFieldInfo) {
            $fieldName = $hideAddressFieldInfo['column_name'];
            $tableName = $hideAddressFieldInfo['table_name'];
            $tableNames[$tableName] = TRUE;
            $aclSelect = "$fieldName AS hide_address";
        }
        else {
            // Safety check so we don't expose addresses that shouldn't be public.
            return array (
                'configured' => FALSE,
            );
        }

        // OR search on keywords.
        $keyword = isset($params['keyword']) ? CRM_Core_DAO::escapeString(trim($params['keyword'])) : '';
        if ($keyword) {
            $keywordFieldInfo = self::keywordFieldInfo();
            if ($keywordFieldInfo) {
                $fieldName = $keywordFieldInfo['column_name'];
                $tableName = $keywordFieldInfo['table_name'];
                $tableNames[$tableName] = TRUE;
                $keywordTerms = explode(' ', $keyword);
                $keywordClauses = array();
                foreach ($keywordTerms as $keywordTerm) {
                    if ($keywordTerm != '') {
                        // See comment dated September 12 2004 3:44pm at
                        // http://dev.mysql.com/doc/refman/5.1/en/fulltext-search.html#function_match
                        $keywordClauses[] = "$fieldName LIKE '%{$keywordTerm}%' AND $fieldName RLIKE '[[:<:]]{$keywordTerm}[[:>:]]'";
                    }
                }
                if ($keywordClauses) {
                    $whereClauses[] = '(' . implode(' OR ', $keywordClauses) . ')';
                }
            }
        }

        if ($params['checked']) {
            // Store checked custom field options in array as:
            // custom field index (1, 2 or 3) => array of values.
            $checkedOptions = explode(',', $params['checked']);
    
            foreach ($checkedOptions as $option) {
                if (preg_match('/^option(\d)_id\[([^\]]*)\]$/', $option, $matches)) {
                    $fieldIndex = $matches[1];
                    $checkedValues[$fieldIndex][] = $matches[2];
                }
            }
    
            // Construct WHERE clause for each checked option.
            if ($checkedValues) {
                foreach ($checkedValues as $fieldIndex => $values) {
                    $fieldID = self::optionFields($fieldIndex);
                    $fieldName = $fieldInfo[$fieldID]['column_name'];
                    $tableName = $fieldInfo[$fieldID]['table_name'];
                    $tableNames[$tableName] = TRUE;
                    $whereSubClauses = array();
                    foreach ($values as $value) {
                        $value = CRM_Core_DAO::escapeString($value);
                        $whereSubClauses[] = "($fieldName LIKE CONCAT('%', CHAR(1), '$value', CHAR(1), '%'))";
                    }
                    $whereClauses[] = '(' . implode(' OR ', $whereSubClauses) . ')';
                }
            }
        }
    
        $aclFrom  = '';
        // Access control: restrict to site parent group.
        if (AJAXSearch_Form_Search::$_limitListingsGroupID) {
            $aclFrom  .= "INNER JOIN civicrm_group_contact gc ON c.id = gc.contact_id AND gc.status = 'Added' AND gc.group_id = " . AJAXSearch_Form_Search::$_limitListingsGroupID;
        }

        $orderBy = 'ORDER BY c.display_name';
        // OR search on terms in organization_name field.
        $where = "WHERE c.is_deleted = 0 AND c.contact_type = 'Organization' AND c.display_name != ''";
        $orgName = CRM_Core_DAO::escapeString(trim($params['org_name']));
        if ($orgName) {
            $orgNameTerms = explode(' ', $orgName);
            $orgNameClauses = array();
            foreach ($orgNameTerms as $orgNameTerm) {
                if ($orgNameTerm != '') {
                    $orgNameClauses[] = "c.organization_name LIKE '%{$orgNameTerm}%'";
                }
            }
            if ($orgNameClauses) {
                $where .= ' AND (' . implode(' OR ', $orgNameClauses) . ')';
                if (count($orgNameClauses) > 1) {
                    $orderBy = "ORDER BY c.display_name LIKE '{$orgName}%' DESC, c.display_name LIKE '%{$orgName}%' DESC, c.display_name";
                }
            }
        }

        if ($whereClauses) {
            $where .= ' AND ' . implode(' AND ', $whereClauses);
        }

        $addressFrom = '';
        $postcode = isset($params['postal_code']) ? CRM_Core_DAO::escapeString(trim($params['postal_code'])) : '';
        if ($postcode && $location_type = intval(variable_get('civicrm_ajax_search_postcode_location_type', 0))) {
            $addressFrom = "INNER JOIN civicrm_address a ON c.id = a.contact_id AND a.location_type_id = $location_type AND (a.postal_code = '$postcode' OR a.postal_code LIKE '$postcode %')";
            if ($hideAddressFieldInfo) {
                $fieldName = $hideAddressFieldInfo['column_name'];
                $tableName = $hideAddressFieldInfo['table_name'];
                $addressFrom .= " AND ({$tableName}.{$fieldName} = 0 OR {$tableName}.{$fieldName} IS NULL)";
            }
        }

        return array (
            'configured' => TRUE,
            'checked' => $checkedValues,
            'where'   => $where,
            'tables'  => $tableNames,
            'aclSelect' => $aclSelect,
            'aclFrom' => $aclFrom,
            'addressFrom' => $addressFrom,
            'orderBy' => $orderBy,
        );
    }
}
