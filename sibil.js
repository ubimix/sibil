var yaml = require('js-yaml');
var fs = require('fs-extra');
var _ = require('underscore');
var Jade = require('jade');
var fileset = require('fileset');
var typogr = require('typogr');
var path = require('path');
var Q = require("q");

var patternsDir = '/home/arkub/git/ux-patterns/';

fs.removeSync('./build');
fs.mkdirSync('./build');

fs.copySync('./assets/css', 'build/css');
fs.copySync('./assets/js', 'build/js');

Q.nfcall(fileset, patternsDir + '**/*')

.then(function(files) {
    return Q.all(_.map(files, function(file) {
        var dir = path.relative(patternsDir, file);
        dir = path.dirname(dir);
        if (dir == '.')
            return;
        if (file.match(/\.md$/g)){
            return transformFile(file);
        } else {
            return copyFile(file);
        }
    }));
})

.fail(function(err) {
    console.log(err);
}).done();

function transformFile(file) {
    return Q.nfcall(fs.readFile, file, 'utf8').then(function(data) {
        console.log(file);
        return parseYaml(data);
    }).then(function(docs){
        return Q.all(_.map(docs, function(doc){
            return getDocumentTemplate(doc).then(function(template){
                if (!template)
                    return '';
                console.log('template:', template);
                return applyTemplate(template, doc);
            })
        })).then(function(blocks){
            var html = blocks.join('\n');
            return applyTemplate('./assets/templates/article.jade', {
                title : 'Hello',
                content : html
            }).then(function(html) {
                
                return saveDoc(file, html);
            })
        })
    });
}

var TEMPLATES = {
        'pattern' : './assets/templates/pattern.jade',
        'example' : './assets/templates/example.jade',
}
function getDocumentTemplate(doc) {
    return Q(TEMPLATES[doc.type]);
}

function applyTemplate(templateFile, doc){
    var options = _.extend({}, doc, {typogr : typogr, pretty: true});
    return Q.nfcall(Jade.renderFile, templateFile, options);
}

function saveDoc(file, html){
    var fileName = path.basename(file, '.md');
    var dir = path.relative(patternsDir, file);
    dir = path.dirname(dir);
    var outputDir = './build/' + dir;
    return Q().then(function(){
        if (!fs.existsSync(outputDir))
            return Q.nfcall(fs.mkdir, outputDir);
        return true;
    }).then(function(){
        return Q.nfcall(fs.writeFile, outputDir + '/' + fileName + '.html', html);    
    }) 
}

function copyFile(file){
    var dir = path.relative(patternsDir, file);
    dir = path.dirname(dir);
    var outputDir = './build/' + dir;
    var outputFile = outputDir + '/' + path.basename(file);
    return Q.nfcall(fs.copy, file, outputFile);
}



function parseYaml(str) {
    var docs = [];
    yaml.safeLoadAll(str, function(doc) {
        if (!doc)
            return;
        docs.push(doc);
    });
    return Q(docs);
}
