/**
 * @author lcc
 *
 * [description]
 * generate xls file
 */
define(['N/runtime', 'N/file', 'N/encode', 'N/url'], function (runtime, file, encode, url) {
    function xlsFile(fileName, folderId) {
        this.name = fileName;
        this.id = folderId;

        // Returns a value of functionName option of button object
        this.createFile = function (data, returnFileId = false) {
            data = data.replace('<html>', '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">');
            var base64EncodedString = encode.convert({
                string: data,
                inputEncoding: encode.Encoding.UTF_8,
                outputEncoding: encode.Encoding.BASE_64
            });
            var fileObj = file.create({
                name: this.name,
                fileType: file.Type.EXCEL,
                contents: base64EncodedString,
                encoding: file.Encoding.UTF8,
                folder: this.id
            });
            var fileId = fileObj.save();
            if (returnFileId)
                return fileId;
            else
                return this.setScript(fileId);
        }

        this.setScript = function (id) {
            var scriptObj = runtime.getCurrentScript();
            var uri = url.resolveScript({
                scriptId: scriptObj.id,
                deploymentId: scriptObj.deploymentId,
                returnExternalUrl: false
            });
            return "eval(window.open('" + uri + "&xlsId=" + id + "'))";
        }
    }

    return {
        generate: xlsFile
    }
});