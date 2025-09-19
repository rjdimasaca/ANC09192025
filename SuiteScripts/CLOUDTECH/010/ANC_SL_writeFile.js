/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/email', 'N/task', 'N/sftp', 'N/encode', 'N/https', 'N/file', './jsrsasign-ns.js', './jsrsasign-ns.js'],
/**
 * @param{email} email
 * @param{dialog} task
 */
function(email, task, sftp, encode, https, file, file, _KJUR, KEYUTIL) {

	var baseDriveApiEndpoint = "https://www.googleapis.com/drive/v3/files";

    function getInputData(scriptContext)
    {
        try{
            log.debug("getInputData test")
            return [5781893];
        }
        catch(e)
        {
            log.error("ERROR in function getInputData", e);
        }
    }
    function map(scriptContext)
    {
        try{
            
            log.debug("map test")
            log.debug("scriptContext", scriptContext);
            log.debug("scriptContext.value", scriptContext.value);
            var title = "TM PO+SO LIST";

            var taskObj = task.create({
                taskType: task.TaskType.SEARCH,
                savedSearchId: scriptContext.value,
                filePath: `SuiteScripts/CLOUDTECH/010/SAVED_SEARCH_EXPORTS/${title}.csv`,
            });

            var taskId = taskObj.submit();
            log.debug("taskId", taskId);
        }
        catch(e)
        {
            log.error("ERROR in function map", e);
        }
    }
    function reduce(scriptContext)
    {
        try{
            
        }
        catch(e)
        {
            log.error("ERROR in function reduce", e);
        }
    }
    function onRequest(scriptContext)
    {
		var rootFolderId = "195fJyssT1MUyWCrSBkhMNbxxvjRjyTnH";
		var rootFolderId = "1WJXis_DNDuYtpf1gy_I66p146E5M2qVe";
		/* var hostUrl = "https://albertanewsprint.sharepoint.com";
		var username = "rodmard";
		var password = "rd12345#24";
		var passwordGuid = "a0f0a298e1e14b23a8b023b43d178c64"
        try{
			fileToUpload = file.load({
				id : 9203484
			})
			
			scriptContext.response.write({output:fileToUpload.getContents()});
			//scriptContext.response.writeFile({file:fileToUpload});
        }
        catch(e)
        {
            log.error("ERROR in function summarize", e);
        } */
		
		
		var accessToken = {accessToken : getToken()};
		var data = {};
		data.desiredGoogleDriveFolderName = "ANC TEST FOLDER VIA API CALL1"
		gdriveFileList = createFolder(accessToken, data, rootFolderId);
		
		log.debug("done", "done")
		
    }
	
	function getToken()
    {
		
        var privatekey_clean = `MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCt9FLB0BFvzl4B
        eDsmnhVJtJI4HD7CmNJBXbDM4EqRS90BHwzbxJNgkwDZ5nr37wL4qxeFKgTtyjFf
        6GpY6Pxeaz/DmuyCCPaJc37c8+goHFRmDnVGdH29T8CX7yupg61fB5wEbOaH0mCI
        dR49gADgq6qeJvWOSHLNxT74tNxotxyn8KocjEJGudFatWUZzLt6GDtUhdbt4RzO
        8vtnHo3W7xQ6aDtsO2oWgNi4Ty5ZteMqjXpKs1MaqEzdKLnCuntieUNzX/3GywrF
        UY5sAdC/pkqyi/xEPuC366w2RUfcf3IX6H02BXzdBiE5wHZ7W+ZF9nFxztVQvvOD
        nS4GLTBzAgMBAAECggEAD+uif1Z5og/zDpNgZoJlVF+QWk5LeCfgZlcazUVhzbZx
        vZ6H4L0298m8dDTh4DshvHx8JJXZ6aFtr2doBEcegc2zAkX1i1kipyXI4JP6FWGy
        X7zHAvG6aE8aQ02CY3tHrMDXiJgm6RtZ9mMxp1NFwUo0zVCnfKQozahVwRFccsDY
        zgitIN8iPwwBgssbYlRVttkR9fSiIvBHf7iYN/m2s0denZUGV0/8GJO7IDOiAsoz
        v+czl/1eIorNsRro2eFVpWpR4vLCLGGilmys3UAJ0ZkScLGt0va3VM6hCbpcA0P/
        aDejCLPRCpgIAXt38A0Dy6mI5Hqu8EpNx92K7oG20QKBgQDgIAvy/hLoTyEd4vd+
        0PalfVjOSou2TPzVgd0/ZCOY11mrRh1LosdsP2RLX/Qt/wWCMkePNpujpNZ+ysA3
        +QY+U+R39Te6o6RSjlgNRSmqQlvxOy1luqCgX/ZJMc3ZwdVEJlVrmgDmZIZtYD4F
        3OPx9SKEqcOXRi98PswwR5O4xQKBgQDGsahQnmuPezaukWjJSRq3A7bFFqutER/t
        gCCT89/Ie4almxrhmjvvIlKZTHUyyPeiAtFADEiXpextiBiyEaf3dIExBOp/cH9I
        pPO68eGqTbS1aTHAQIaCF67MmEDlHU9/HRB/SOyyiYaBgcexbdtoSyMd8v++TGgc
        b8hAEYsn1wKBgQCg1n6cv7Zj3j1ezD1eVala84wiZp7CkZczxUE4N63QBmMEJYnq
        eINybD+WU+LQi12xpFF0NfUVR7riPLAauuu/GMcxStnWZ48J67rGsyaGV57Ri+01
        Puv8i0EcH9Cg/5gDkxrj4B3bOLK7lUCNRoqSXZ+K4qVJTwXOvOYdk5AwHQKBgHTn
        DA+61bAKn4agGRXsxCIPtlZJW2KtI6rZ6tEB+JV9UCBZnLxFwaOV/yEg4geqREB3
        BeR4FbHbtrpPC7ChQMEQM/7CVLH8X3c/TgOc0tgfdgYSSWpCzKD4DClmHzBuSVqR
        oCYzosf8sD28PODAsQmww42Ybi3pyIuKnThM2iHrAoGBANVFV1fyzlVNeTpyJHyC
        lZmMnpbvzaYM9QrIj97RmSNzXxlkUjBXe+iqQN5nHDc01L+DFxZg8iXz4jajaxlx
        F5WunfQ8T3hpWHAHouYcGHVVhGdnTDyv+EJF2LYsKxsdiGM1SYzfwbhqF6WSNloq
        sYrk8/x9D5JRzBFAeoMx/4hX`

        var privatekey_clean = `-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDsVoNCg92Mc8mE\nxmu/a9G2Q/qKyLApwW7P8G6s1y7A86uIQmHDSk4dGK9hhgym7Dc5ksctDyZL2Q1x\n8uVm5tbwhSSVTsX1M98map11X6XcldFvAHyMw1dIJj9n2XbpZosyAujBkns2RTy2\n9Wf5eDX4jgmYvGeoTWLsmZ9VAnMfoYYjwTBX1e0BeyFlN4DDplINnN0jHzJ/QaRL\n54imoRiicjpZGctpmrTjMn7HnITbZ5gOFUb2ybZiGtv9m4nwEcG9SdZ2Yk9ZEhI5\nfIw+ny30c75zLR1EDkIIORRwWHDPdCayRLq/08yg3LVt/EpdNdcQaRcNRqNaNZ9f\nDWdz49NXAgMBAAECggEAQGu0i8T19vr4y0BqzlrNZylQedQKcNdRJU0cXfCpxd6l\nuxadH2Z5tGSuKZ8og7ePthnUQOwIPFSF3bGf5lS18gnY1voJ67Sf9xDIqt3PkDkm\nRWOUj6oPeJM0ZVJZn3VcK92vJFSRUVG+IwDxvoaN75qH8yIn/zBY7rVRQRLR3qTa\niICRiLhidtW16hGBxxaIB/jeqFhytQnyItFrHxRYVjltPLMr1qTcjMgAO7QY2I7k\nQc4xuU9aBLFnSXwBXM9Lq7xPZNNYmC307NQmfle8mVwD4ULFkyb94XgtshP2IZEF\n5VNCuFpmnM8gsaI7n80VKWvCeeuWcLuSJhYqHEbnwQKBgQD+MCO1joCbVw4wBpCS\ngnpe5ZY4k6qY2bXrNus0LQZvXabaZxWaK8aC+8Yylvs6TXf1u+dAKDgCktn/Rlb8\nwRWB5rJLrf9V26uTV3RNSIMyhxrvnlSQUhhaI4F9RxKNRqmbVf8x44f9grZP8ofl\nyXUCmtYn6rrf+CB2zJAMEhHwwwKBgQDuBcyRsmCCK9spjGc/h1RRL5RcxpyujEHn\nccvdd6mwHEzCG4L7GoItwNZi1h0n+toDEg8FquZDDnzg6pTC8JwOYh0sEhA9FEro\nbhya3r9OwfIDCJHU+Ki8UnWRSDQAWGxt66y2qpT3e9i0HfpWGlXLxIzqsnOuzMmR\nGpFNXE1p3QKBgCNNcEgw6G+qoY/N+Zo/gNtZK4nkCFd+NSPb1sLCVhh1e0zt8DQf\nTEy4xwgTrASm6bg5Rp7EdzL0Tk6D6GTmNCR8c9rK6aF1BtlJ1h89qOsFlJoe9UOu\nAy/RqpRJoKv6Wmf2g6DcJvDwjH2CA5nIZvXbp06X7ShZ/7hAJOloQRGdAoGAWB7P\ngLVAY5Dm/7faVbu9bJ0n2T0yrrCAibYomqJ9sRSZGlfjIyHKRjQZatgITU/ivLZH\n13pQ60yG0SIn1xALRovubu11E5far7hsYK3Mt9S3y4W1r9orZiVFH3dSwTn7Uqqo\n86utoP452V0r3Aq97sWiwhU1HOb2TQFAABsHEgUCgYBlWSa7Mj6YT//aSd6m56Up\nUXD+eqgUqgw22f2h7MFHt+tfcNzpXjPz8SlAeiVA5ZOupzKK6vJC9LsaahmZN+EY\nb4hbltElO+FxlSMAE0cpO3/eLeFSFfcEuHim+jQsHe3Z+QBdHtZ0BT17TisyH+gL\nptkB0EvUuMqMy4CKkDRFcQ==\n-----END PRIVATE KEY-----\n`

        var tokenEndpoint = 'https://accounts.google.com/o/oauth2/token';

        var configObj = {};
		configObj["Private Key"] = "privatekey_clean";
		configObj["Service Account Email"] = "joycloud-prolecto@joycloud-prolecto.iam.gserviceaccount.com";
		configObj["auth_uri"] = "https://accounts.google.com/o/oauth2/auth";
		configObj["token_uri"] = "https://oauth2.googleapis.com/token";

		
        //this is provided as an export from google representing the credentials of the service account
        var jsonKeyData = {
            "type": "service_account",
            "project_id": "joycloud-prolecto",
            "private_key_id": "e61650c71390f31b984675cb5d0d2aaad6cd0ec4",
            // "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDsVoNCg92Mc8mE\nxmu/a9G2Q/qKyLApwW7P8G6s1y7A86uIQmHDSk4dGK9hhgym7Dc5ksctDyZL2Q1x\n8uVm5tbwhSSVTsX1M98map11X6XcldFvAHyMw1dIJj9n2XbpZosyAujBkns2RTy2\n9Wf5eDX4jgmYvGeoTWLsmZ9VAnMfoYYjwTBX1e0BeyFlN4DDplINnN0jHzJ/QaRL\n54imoRiicjpZGctpmrTjMn7HnITbZ5gOFUb2ybZiGtv9m4nwEcG9SdZ2Yk9ZEhI5\nfIw+ny30c75zLR1EDkIIORRwWHDPdCayRLq/08yg3LVt/EpdNdcQaRcNRqNaNZ9f\nDWdz49NXAgMBAAECggEAQGu0i8T19vr4y0BqzlrNZylQedQKcNdRJU0cXfCpxd6l\nuxadH2Z5tGSuKZ8og7ePthnUQOwIPFSF3bGf5lS18gnY1voJ67Sf9xDIqt3PkDkm\nRWOUj6oPeJM0ZVJZn3VcK92vJFSRUVG+IwDxvoaN75qH8yIn/zBY7rVRQRLR3qTa\niICRiLhidtW16hGBxxaIB/jeqFhytQnyItFrHxRYVjltPLMr1qTcjMgAO7QY2I7k\nQc4xuU9aBLFnSXwBXM9Lq7xPZNNYmC307NQmfle8mVwD4ULFkyb94XgtshP2IZEF\n5VNCuFpmnM8gsaI7n80VKWvCeeuWcLuSJhYqHEbnwQKBgQD+MCO1joCbVw4wBpCS\ngnpe5ZY4k6qY2bXrNus0LQZvXabaZxWaK8aC+8Yylvs6TXf1u+dAKDgCktn/Rlb8\nwRWB5rJLrf9V26uTV3RNSIMyhxrvnlSQUhhaI4F9RxKNRqmbVf8x44f9grZP8ofl\nyXUCmtYn6rrf+CB2zJAMEhHwwwKBgQDuBcyRsmCCK9spjGc/h1RRL5RcxpyujEHn\nccvdd6mwHEzCG4L7GoItwNZi1h0n+toDEg8FquZDDnzg6pTC8JwOYh0sEhA9FEro\nbhya3r9OwfIDCJHU+Ki8UnWRSDQAWGxt66y2qpT3e9i0HfpWGlXLxIzqsnOuzMmR\nGpFNXE1p3QKBgCNNcEgw6G+qoY/N+Zo/gNtZK4nkCFd+NSPb1sLCVhh1e0zt8DQf\nTEy4xwgTrASm6bg5Rp7EdzL0Tk6D6GTmNCR8c9rK6aF1BtlJ1h89qOsFlJoe9UOu\nAy/RqpRJoKv6Wmf2g6DcJvDwjH2CA5nIZvXbp06X7ShZ/7hAJOloQRGdAoGAWB7P\ngLVAY5Dm/7faVbu9bJ0n2T0yrrCAibYomqJ9sRSZGlfjIyHKRjQZatgITU/ivLZH\n13pQ60yG0SIn1xALRovubu11E5far7hsYK3Mt9S3y4W1r9orZiVFH3dSwTn7Uqqo\n86utoP452V0r3Aq97sWiwhU1HOb2TQFAABsHEgUCgYBlWSa7Mj6YT//aSd6m56Up\nUXD+eqgUqgw22f2h7MFHt+tfcNzpXjPz8SlAeiVA5ZOupzKK6vJC9LsaahmZN+EY\nb4hbltElO+FxlSMAE0cpO3/eLeFSFfcEuHim+jQsHe3Z+QBdHtZ0BT17TisyH+gL\nptkB0EvUuMqMy4CKkDRFcQ==\n-----END PRIVATE KEY-----\n",
            "private_key": configObj["Private Key"],
            "client_email": "joycloud-prolecto@joycloud-prolecto.iam.gserviceaccount.com",
            "client_email": configObj["Service Account Email"],
            "client_id": "116050282024887808485",
            // "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "auth_uri": configObj["auth_uri"],
            "token_uri": "https://oauth2.googleapis.com/token",
            //"auth_uri": configObj["token_uri"],
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/joycloud-prolecto%40joycloud-prolecto.iam.gserviceaccount.com",
            "universe_domain": "googleapis.com"
          }

          var jwtHeader = {
            alg: 'RS256',
            typ: 'JWT'
          };

        // Construct the JWT payload
        var now = Math.floor(Date.now() / 1000);
        var jwtPayload = {
            iss: jsonKeyData.client_email,
            scope: `https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file`,
            // scope: `https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.readonly`,
            aud: 'https://accounts.google.com/o/oauth2/token',
            exp: now + 3600, // Set expiration to 1 hour
            iat: now
        };

        // Encode the JWT header and payload
        var encodedHeader = base64UrlEncode(JSON.stringify(jwtHeader));
        var encodedPayload = base64UrlEncode(JSON.stringify(jwtPayload));

        log.debug("encodedHeader", encodedHeader)
        log.debug("encodedPayload", encodedPayload)
        // Construct the JWT assertion
        var jwtAssertion = encodedHeader + '.' + encodedPayload;

        log.debug("jwtAssertion", jwtAssertion)

        var rsaKey = privatekey_clean;
        try{
            rsaKey = _KJUR.KEYUTIL.getKey(jsonKeyData.private_key)
        }
        catch(e)
        {
            log.debug("ERROR in _KJUR.KEYUTIL.getKey", jsonKeyData.private_key)
        }

        var jwtAssertionWithSignature = _KJUR.KJUR.jws.JWS.sign('RS256', JSON.stringify(jwtHeader), JSON.stringify(jwtPayload), rsaKey);
        
        log.debug("jwtAssertionWithSignature", jwtAssertionWithSignature);
    
        // OAuth 2.0 endpoint for token exchange
        var tokenEndpoint = 'https://accounts.google.com/o/oauth2/token';
    
        // Construct the request payload
        var payload = {
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwtAssertionWithSignature
        };
    
        // Send a POST request to the token endpoint
        var response = https.post({
            url: tokenEndpoint,
            body: payload,
            headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
    
        // Parse the response and retrieve the access token
        var responseBody = JSON.parse(response.body);
        log.debug("responseBody0", responseBody)
        var accessToken = responseBody.access_token;
        log.debug("accessToken0", accessToken)

        return accessToken;
    }
	
	function createFolder(accessToken, data, rootFolderId, noRetry)
    {
        //you can probably define permissions here too TODO
        log.debug("createFolder accessToken", accessToken)
        var resourcePath = ``;

        var fullDriveApiEndpoint = baseDriveApiEndpoint + resourcePath

        log.debug("createFolder fullDriveApiEndpoint", fullDriveApiEndpoint)
        var payload = JSON.stringify({
            "name" : `${data.desiredGoogleDriveFolderName}_test1_${'.csv'}`,
            // "mimeType": 'application/vnd.google-apps.folder',
            "mimeType": 'csv',
            // "parents": [rootFolderId] //needs to be in square brackets/array, else it will be created on the root folder of the drive,
            "parents": [rootFolderId], //needs to be in square brackets/array, else it will be created on the root folder of the drive,
        });
		
		
		// var requestBody =
                // '\r\n--foo_bar_baz\r\n' +
                // 'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
                // JSON.stringify(metadata) + '\r\n' +
                // '\r\n--foo_bar_baz\r\n' +
                // 'Content-Type: text/plain\r\n\r\n' +
                // textContent + '\r\n' +
                // '\r\n--foo_bar_baz--';
				
        var requestObj = {
            url: fullDriveApiEndpoint + "?uploadType=media",
            headers: {
            Authorization: 'Bearer ' + accessToken.accessToken
            // Authorization: 'Bearer ' + 'ya29.a0AfB_byCN_KJn7rK5_b91zy5utbEzRBjUioND4ND4qqEmErdkQ4DIQfKqEb7HI8Ll5YS2HL7XHgsqik7Q348IiOokzjGfSNIIDlUBEYfHq2Ordd-oEoqna-TjhlvegloEPDGFTSVlqTiilE0o5_X1JFOg-PibaCgYKAW0SARISFQHsvYls-NCMaZOJA_12W7WDFzh4OQ0163'
            },
            body : payload
        };
        var apiResponse = https.post(requestObj);
    
        // Process the API response or perform other actions
        log.debug('createFolder API Response', apiResponse.body);

        log.debug(typeof apiResponse.body);

        var responseBodyJson = {};
        var gdriveResourceList = [];
        try{
            responseBodyJson = JSON.parse(apiResponse.body)
        }
        catch(e)
        {
            log.audit("createFolder ERROR parsing responseBody as JSON", e)
        }

        //prevent endless loop/recursion
        if(!noRetry && responseBodyJson && responseBodyJson.error && responseBodyJson.status == "UNAUTHENTICATED")
        {
            //call same function with fresh tokens
            tokenExpired(accessToken)
            //createFolder(accessToken, data, rootFolderId, true);
            return;
        }

        //can check headers too? need to explore
        if(responseBodyJson && (typeof responseBodyJson == "object") && responseBodyJson.id)
        {
            gdriveResourceList = [responseBodyJson];
        }

        log.debug("createFolder gdriveResourceList", gdriveResourceList);

        //generateGrApiLogs(data, accessToken, "createFolder", requestObj, apiResponse.body);

        return gdriveResourceList;
        
        // { "kind": "drive#file", "id": "1sT22G6653jw363TvcHkpDvQRR1CZ-NfK", "name": "My New Folder", "mimeType": "application/vnd.google-apps.folder" }
    }
	
	/**
     * Encode a string using base64 URL-safe encoding
     * @param {string} input - The string to encode
     * @returns {string} - The encoded string
     */
    function base64UrlEncode(input) {
        const base64 = encodeBase64(input);
        const base64Url = base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
        return base64Url;
    }

    function encodeBase64(input) {
        const encodedString = encode.convert({
          string: input,
          inputEncoding: encode.Encoding.UTF_8,
          outputEncoding: encode.Encoding.BASE_64
        });
        return encodedString;
      }


    /**
     * Sign a message using a private key
     * deprecated, no longer needs certificate, just use jwt signing
     * @param {string} message - The message to sign
     * @param {string} privateKey - The private key in PEM format
     * @returns {string} - The signature
     */
    function signWithPrivateKey(message, privateKey) {
        const privateKeyFile = file.create({
        name: 'privateKey.pem',
        fileType: file.Type.PLAINTEXT,
        contents: privateKey
        });
    
        var signer = certificate.createSigner({
            certId : "custcertificategooglerootcert",
            algorithm: certificate.HashAlg.SHA256
        })

        const signResult = signer.sign({
            key: privateKeyFile,
            algorithm: crypto.HashAlg.RSA_SHA256,
            input: message,
            outputEncoding: encode.Encoding.BASE_64
        });
    
        const signature = signResult.signature;
        return signature;
    }

    return {
        onRequest : onRequest
    }
})