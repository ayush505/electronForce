/* global $ */
// Initial interface setup using jQuery (since it's around from bootstrap anyway).
$(document).ready(() => {
  // Hide the places for handling responses until we have some.
  $('#org-status').hide();
  $('#api-request-form').hide();
  $('#results-table-wrapper').hide();
  $('#results-object-viewer-wrapper').hide();

  // Setup to show/hide all the various controls needed for the APIs.
  // Initially this is deeply insufficient, when enough controls exist this code
  // style will be really really unmaintainable.
  // @TODO: Do this better!
  const apiSelectors = {
    'rest-api-soql': 'query',
    'rest-api-sosl': 'search',
    'rest-api-describe': 'describe',
    'org-explorer': 'orgExplore',
    'org-describe-global': 'describeGlobal',
  };

  let element;
  Object.keys(apiSelectors).forEach((selector) => {
    element = $(`#${selector}`);
    if (element) {
      element.hide();
      const trigger = $('.sf-api-trigger-button', element);
      trigger.wrapperElement = element;
      // This click handler provides the trigger to send messages to the main process.
      trigger.click((event) => {
        const dataElements = $('.api-data-element', event.currentTarget.wrapperElement);
        const data = { org: $('#active-org').val() };
        dataElements.each((index, item) => {
          data[$(item).attr('id').replace(/-/g, '_')] = $(item).val();
        });
        // Send prepared data to the main process.
        window.api.send(`sf_${apiSelectors[selector]}`, data);
      });
    }
  });

  $('#select-api').change(() => {
    // Show the controls for the selected API.
    const newValue = $('#select-api').val();
    $(`#${newValue}`).show();

    // Hide all other controls.
    let hideSelector;
    $('#select-api').find('option').each((index, item) => {
      if (item.value !== newValue) {
        hideSelector = item.value;
        $(`#${hideSelector}`).hide();
      }
    });
  });
});

// ============= Helpers ==============
// Simple find and replace of text based on selector.
const replaceText = (selector, text) => {
  const element = document.getElementById(selector);
  if (element) element.innerText = text;
};

// Convert a simple object with name/value pairs, and sub-objects into an Unordered list
const object2ul = (data) => {
  const ul = document.createElement('ul');
  const keys = Object.keys(data);
  let li;
  let i;

  for (i = 0; i < keys.length; i += 1) {
    li = document.createElement('li');
    // if it's sub-object recurse.
    if (typeof data[keys[i]] === 'object' && data[keys[i]] !== null) {
      li.appendChild(object2ul(data[keys[i]]));
    } else {
      // append the text to the li.
      li.appendChild(document.createTextNode(data[keys[i]]));
    }
    ul.appendChild(li); // append the list item to the ul
  }

  return ul;
};


const displayRawResponse = (responseObject) => {
  replaceText('raw-response', JSON.stringify(responseObject, undefined, 2));
};

const refreshResponseTable = (sObjectData) => {
  document.getElementById('results-table-wrapper').style.display = 'block';
  document.getElementById('results-object-viewer-wrapper').style.display = 'none';
  document.getElementById('results-summary-count').innerText = `Fetched ${sObjectData.records.length} of ${sObjectData.totalSize} records`;

  // Get the table.
  const resultsTable = document.querySelector('#results-table');

  // Clear existing table.
  while (resultsTable.firstChild) {
    resultsTable.removeChild(resultsTable.firstChild);
  }

  // Extract the header.
  const keys = Object.keys(sObjectData.records[0]).filter((value) => value !== 'attributes');

  // Create the header row for the table.
  const tHead = document.createElement('thead');
  const headRow = document.createElement('tr');
  headRow.setAttribute('class', 'table-primary');
  let newHeader;
  let textNode;
  // Add the type column
  newHeader = document.createElement('th');
  newHeader.setAttribute('scope', 'col');
  textNode = document.createTextNode('Type');
  newHeader.appendChild(textNode);
  headRow.appendChild(newHeader);
  // Add the other columns from the result set.
  for (let i = 0; i < keys.length; i += 1) {
    newHeader = document.createElement('th');
    newHeader.setAttribute('scope', 'col');
    textNode = document.createTextNode(keys[i]);
    newHeader.appendChild(textNode);
    headRow.appendChild(newHeader);
  }
  tHead.appendChild(headRow);
  resultsTable.appendChild(tHead);

  // Add the data.
  let dataRow;
  let newData;
  const tBody = document.createElement('tbody');
  for (let i = 0; i < sObjectData.records.length; i += 1) {
    dataRow = document.createElement('tr');
    // Put the object type as a row level header.
    newData = document.createElement('th');
    newData.setAttribute('scope', 'row');
    textNode = document.createTextNode(sObjectData.records[i].attributes.type);
    newData.appendChild(textNode);
    dataRow.appendChild(newData);
    for (let j = 0; j < keys.length; j += 1) {
      newData = document.createElement('td');
      textNode = document.createTextNode(sObjectData.records[i][keys[j]]);
      newData.appendChild(textNode);
      dataRow.appendChild(newData);
    }
    tBody.appendChild(dataRow);
  }
  resultsTable.appendChild(tBody);
};

const refreshObjectDisplay = (data) => {
  $('#results-object-viewer-wrapper .results-summary h3').text(data.message);

  // When this is displaying a describe add a little helpful sumamry.
  if (Object.prototype.hasOwnProperty.call(data, 'response.fields')) {
    $('#results-object-viewer-wrapper .results-summary p').text(`Found ${data.response.fields.length} fields and ${data.response.recordTypeInfos.length} record types.`);
  } else {
    $('#results-object-viewer-wrapper .results-summary p').text('');
  }

  $('#results-object-viewer').jsonViewer(data.response, {
    collapsed: true,
    rootCollapsable: false,
    withQuotes: true,
    withLinks: true,
  });
};

const displayGlobalDescribe = (sObjectData) => {
  // Setup.
  document.getElementById('results-table-wrapper').style.display = 'block';
  document.getElementById('results-object-viewer-wrapper').style.display = 'none';
  document.getElementById('results-summary-count').innerText = `Your orgs contains ${sObjectData.length} objects (custom and standard)`;

  // Get the table.
  const resultsTable = document.querySelector('#results-table');

  // Clear existing table.
  while (resultsTable.firstChild) {
    resultsTable.removeChild(resultsTable.firstChild);
  }

  // Extract the header.
  const keys = Object.keys(sObjectData[0]);

  // Create the header row for the table.
  const tHead = document.createElement('thead');
  const headRow = document.createElement('tr');
  headRow.setAttribute('class', 'table-primary');
  let newHeader;
  let contentNode;
  // Add the other columns from the result set.
  for (let i = 0; i < keys.length; i += 1) {
    newHeader = document.createElement('th');
    newHeader.setAttribute('scope', 'col');
    contentNode = document.createTextNode(keys[i]);
    newHeader.appendChild(contentNode);
    headRow.appendChild(newHeader);
  }
  tHead.appendChild(headRow);
  resultsTable.appendChild(tHead);

  // Add the data.
  let dataRow;
  let newData;
  const tBody = document.createElement('tbody');
  for (let i = 0; i < sObjectData.length; i += 1) {
    dataRow = document.createElement('tr');
    for (let j = 0; j < keys.length; j += 1) {
      // Special Case handling for urls field
      if (keys[j] === 'urls') {
        contentNode = object2ul(sObjectData[i][keys[j]]);
      } else {
        contentNode = document.createTextNode(sObjectData[i][keys[j]]);
      }

      // Add the new content to the row
      newData = document.createElement('td');
      newData.appendChild(contentNode);
      dataRow.appendChild(newData);
    }
    tBody.appendChild(dataRow);
  }
  resultsTable.appendChild(tBody);
};

// ===== Response handlers from IPC Messages to render context ======
// Login response.
window.api.receive('response_login', (data) => {
  if (data.status) {
    // Add the new connection to the list of options.
    const opt = document.createElement('option');
    opt.value = data.response.organizationId;
    opt.innerHTML = document.getElementById('login-username').value;
    opt.id = `sforg-${opt.value}`;
    document.getElementById('active-org').appendChild(opt);

    // Shuffle what's shown.
    document.getElementById('org-status').style.display = 'block';
    document.getElementById('api-request-form').style.display = 'block';
    replaceText('active-org-id', data.response.organizationId);
    replaceText('login-response-message', data.message);
    displayRawResponse(data.response);
  }
});

// Logout Response.
window.api.receive('response_logout', (data) => {
  displayRawResponse(data);
  // TODO: Remove connection information.
});

// Generic Response.
window.api.receive('response_generic', (data) => {
  displayRawResponse(data);
});

// Query Response. Print the query results in table.
window.api.receive('response_query', (data) => {
  if (data.status) {
    displayRawResponse(data);
    refreshResponseTable(data.response);
  } else {
    displayRawResponse(data.message);
  }
});

// @TODO: Refactor to merge the next three functions.
// Describe Response Handler: setup jsTree.
window.api.receive('response_describe', (data) => {
  document.getElementById('results-table-wrapper').style.display = 'none';
  document.getElementById('results-object-viewer-wrapper').style.display = 'block';
  displayRawResponse(data);
  if (data.status) {
    refreshObjectDisplay(data);
  }
});

// Global Describe Response Handler: setup jsTree.
window.api.receive('response_describe_global', (data) => {
  document.getElementById('results-table-wrapper').style.display = 'none';
  document.getElementById('results-object-viewer-wrapper').style.display = 'block';
  displayRawResponse(data);
  if (data.status) {
    displayGlobalDescribe(data.response.sobjects);
  }
});

// Org Details Response Handler: setup jsTree.
window.api.receive('response_org_object_display', (data) => {
  document.getElementById('results-table-wrapper').style.display = 'none';
  document.getElementById('results-object-viewer-wrapper').style.display = 'block';
  displayRawResponse(data);
  if (data.status) {
    refreshObjectDisplay(data);
  }
});

// ========= Messages to the main process ===============
// Login
document.getElementById('login-trigger').addEventListener('click', () => {
  window.api.send('sf_login', {
    username: document.getElementById('login-username').value,
    password: document.getElementById('login-password').value,
    token: document.getElementById('login-token').value,
    url: document.getElementById('login-url').value,
  });
});

// Logout
document.getElementById('logout-trigger').addEventListener('click', () => {
  window.api.send('sf_logout', { org: document.getElementById('active-org').value });
  document.getElementById('org-status').style.display = 'none';
  // @TODO: Remove org from list of active orgs.
  // @TODO: Update/hide status area if no orgs remain.
});
