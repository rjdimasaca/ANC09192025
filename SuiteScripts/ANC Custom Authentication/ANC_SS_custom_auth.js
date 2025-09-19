/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/runtime', 'N/sftp', 'N/https', 'N/search', 'N/file'],
/**
 * @param {record} record
 * @param {runtime} runtime
 * @param {sftp} sftp
 */
function(record, runtime, sftp, https, search, file) {
   
    /**
     * Definition of the Scheduled script trigger point.
     *
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
     * @Since 2015.2
     */
    function execute(scriptContext)
    {
        dumpFile(scriptContext)
    }
    
    function dumpFile(scriptContext)
    {
        try
        {
            var passwordText = generateP();
            
            
            //var myPwdGuid = "netrodsuite";
            var passwordGuid = "05f4e40004484a1eb338ba5d5a88f7e2";
            var hostKey = "AAAAB3NzaC1yc2EAAAADAQABAAAAgQCFzDO6AiZhK4ks4Bz/VBysjB3fpExCfOmy2EuI2gXJDYgom4nvZK4eEEgHRrkNoRUww4RJ7CTRKKXWodP7OthQw2AfppgBfR8dUK3zYdp/IClqTZ0+yxk72lLV9k8HwbtalOEzlJNc6AKlAkDi+WtG8RRZbJeaQZf3pe0k6oa7yQ==";
            var hostUrl = "sftp.couchdrop.io";
            var username = "netrodsuite";
            var password = "AncFtp$23"; //TODO keep this hidden and secure, not mandatory
            
            // Establish a connection to a remote FTP server
            var connection = sftp.createConnection({
                username: username,
//                password: password,
                passwordGuid: passwordGuid,
                url: hostUrl,
                hostKey: hostKey,
                port : 22 //22 //21
            });

            // Create a file to upload using the N/file module
            var fileToUpload = file.create({
                name: 'anc_custom_authentication.txt',
                fileType: file.Type.PLAINTEXT,
                contents: passwordText
            });
            

            // Upload the file to the remote server
            connection.upload({
                directory: '/Netsuite/Link Key/',
                filename: 'anc_custom_authentication.txt',
                file: fileToUpload,
                replaceExisting: true
            });

            log.debug("connection", connection);

            var fileExistsInServer = false;
            var downloadedFile = null;
            // Download the file from the remote server
            try
            {
                downloadedFile = connection.download({
                    directory: '/Netsuite/Link Key/',
                    filename: 'anc_custom_authentication.txt'
                });
            }
            catch(e)
            {
                //means 
                log.error("failed to download file, error : ", e);
                
                if(downloadedFile && fileToUpload && downloadedFile.getContents() == fileToUpload.getContents())
                {
                    
                    var submittedRecId = submitRecord(passwordText);
                    
                }
                
                return;
            }
            
            
            log.debug("downloadedFile.getContents()", downloadedFile.getContents());
            
            log.debug("downloadedFile.getContents()", downloadedFile.getContents());
            log.debug("fileToUpload.getContents()", fileToUpload.getContents());
            if(downloadedFile.getContents() == fileToUpload.getContents())
            {
                
                var submittedRecId = submitRecord(passwordText);
                
            }
            
            log.debug("downloadedFile", downloadedFile)
            
            /*var passwordText = generateP();
            var submittedRecId = submitRecord(passwordText);*/
        }
        catch(e)
        {
            log.error("ERROR in function ", e)
        }
    }
    
    function submitRecord(passwordText)
    {
        var submittedRecId = "";
        try
        {
            var recSearch = search.create({
                type : "customrecord_anc_customauth"
            });
            var recId = "";
            var sr = recSearch.run().each(function(res){
                recId = res.id;
                return false;
            })
            var recObj = null;
            if(recId)
            {
                recObj = record.load({
                    type : "customrecord_anc_customauth",
                    id : recId
                })
            }
            else
            {
                recObj = record.create({
                    type : "customrecord_anc_customauth",
                })
            }
            
            recObj.setValue({
                fieldId : "custrecord_anc_customauth",
                value : passwordText
            })
            
            var submittedRecId = recObj.save({
                ignoreMandatoryFields : true,
                allowSourcing : true
            });
            
            log.debug("submittedRecId", submittedRecId);
        }
        catch(e)
        {
            log.error("ERROR in function submitRecord", e);
        }
        
        return submittedRecId;
    }
    
    function generateP() {
        var pass = '';
        var str = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' + 
                'abcdefghijklmnopqrstuvwxyz0123456789@$';
          
        for (i = 1; i <= 64; i++) {
            var char = Math.floor(Math.random()
                        * str.length + 1);
              
            pass += str.charAt(char)
        }
          
        return pass;
    }

    return {
        execute: execute
    };
    
});
