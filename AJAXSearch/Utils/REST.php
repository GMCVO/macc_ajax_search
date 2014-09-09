<?php

require_once 'CRM/Utils/Array.php';
require_once 'CRM/Utils/REST.php';

class AJAXSearch_Utils_REST extends CRM_Utils_REST {

  /*
   * Based on CRM_Utils_REST::ajax() from CiviCRM 4.4.6
   * - replicated here so that we can allow anonymous access, via
   *  AJAXSearch/xml/Menu/ajaxsearch.xml, just to the AJAX functions needed
   *  by the public search. Note that API v3 also has permissioning per
   *  entity/method, here specified in
   *  civicrm_ajax_search_civicrm_alterAPIPermissions, but the default
   *  permission for civicrm/ajax/rest in CRM/Core/xml/Menu/Misc.xml
   *  requires 'access CiviCRM' so rather than change this we use
   *  civicrm/ajaxsearch/rest defined in AJAXSearch/xml/Menu/ajaxsearch.xml
   *  which directs to the ajax() function below.
   */
  static function ajax() {
    $requestParams = CRM_Utils_Request::exportValues();

    // this is driven by the menu system, so we can use permissioning to
    // restrict calls to this etc
    // the request has to be sent by an ajax call. First line of protection against csrf
    $config = CRM_Core_Config::singleton();
    if (!$config->debug &&
      (!array_key_exists('HTTP_X_REQUESTED_WITH', $_SERVER) ||
        $_SERVER['HTTP_X_REQUESTED_WITH'] != "XMLHttpRequest"
      )
    ) {
      require_once 'api/v3/utils.php';
      $error = civicrm_api3_create_error("SECURITY ALERT: Ajax requests can only be issued by javascript clients, eg. CRM.api3().",
        array(
          'IP' => $_SERVER['REMOTE_ADDR'],
          'level' => 'security',
          'referer' => $_SERVER['HTTP_REFERER'],
          'reason' => 'CSRF suspected',
        )
      );
      echo json_encode($error);
      CRM_Utils_System::civiExit();
    }

    $q = CRM_Utils_Array::value('fnName', $requestParams);
    if (!$q) {
      $entity = CRM_Utils_Array::value('entity', $requestParams);
      $action = CRM_Utils_Array::value('action', $requestParams);
      if (!$entity || !$action) {
        $err = array('error_message' => 'missing mandatory params "entity=" or "action="', 'is_error' => 1);
        echo self::output($err);
        CRM_Utils_System::civiExit();
      }
      $args = array('civicrm', $entity, $action);
    }
    else {
      $args = explode('/', $q);
    }

    // get the class name, since all ajax functions pass className
    $className = CRM_Utils_Array::value('className', $requestParams);

    // If the function isn't one that we specifically permit, reject the request.
    if ( ( $args[0] != 'civicrm' || $args[1] != 'contact' ||
      ($args[2] != 'ajaxpresearch' && $args[2] != 'ajaxsearch') ||
      count( $args ) != 3 ) ) {
        $err = array ('error_message' => 'Request not permitted' , 'is_error'=> 1 );
      echo self::output( $err );
      CRM_Utils_System::civiExit( );
    }

    // Support for multiple api calls
    if (isset($entity) && $entity === 'api3') {
      $result = self::processMultiple();
    }
    else {
      $result = self::process($args, self::buildParamList());
    }

    echo self::output($result);

    CRM_Utils_System::civiExit();
  }
}