var yaml = require('js-yaml');
var fs = require('fs-extra');
var _ = require('underscore');
var Jade = require('jade');
var fileset = require('fileset');
var typogr = require('typogr');
var path = require('path');
var Q = require('q');
var Marked = require('marked');

var patternsDir = '/home/arkub/git/ux-patterns/';

fs.removeSync('./build');
fs.mkdirSync('./build');

fs.copySync('./assets/css', 'build/css');
fs.copySync('./assets/js', 'build/js');

var locals = {
        'title':'UX Patterns for Maps',
        'url': '../',
        'description': ''
      }

Q.nfcall(fileset, patternsDir + '**/*')

.then(function(files) {
    return Q.all(_.map(files, function(file) {
        var dir = path.relative(patternsDir, file);
        dir = path.dirname(dir);
        if (dir == '.')
            return;
        if (file.match(/\.md$/g)){
            return transformFile(file);
        } else if (fs.lstatSync(file).isFile()) {
            return copyFile(file);
        }
    }));
})

.then(function(err) {
    Q.nfcall(fileset, patternsDir + '**/*.md')
    
    .then(function(files) {
        var patterns = [];
        _.each(files, function(file) {
            var dir = path.relative(patternsDir, file);
            dir = path.dirname(dir);
            if (dir == '.')
                return;
            var data = fs.readFileSync(file, 'utf8');
            var obj = parseYamlNoQ(data);
            obj[0].folder = dir;
            patterns.push(obj[0]);
        });
                
        return transformFile(patternsDir+'index.md', patterns);
        
    });
    
})

.fail(function(err) {
    console.log(err);
}).done();

function transformFile(file, patterns) {
    return Q.nfcall(fs.readFile, file, 'utf8').then(function(data) {
        console.log(file);
        return parseYaml(data);
    }).then(function(docs){
        return Q.all(_.map(docs, function(doc){
            return getDocumentTemplate(doc).then(function(template){
                if (!template)
                    return '';
                console.log('template:', template);

                return applyTemplate(template, doc, patterns);
            })
        })).then(function(blocks){
            var html = blocks.join('\n');
            var fileDir = path.dirname(file);
            var homePath = path.relative(fileDir, patternsDir) || '.';
            var title = docs[0].title == locals.title ? locals.title : docs[0].title + ' – ' + locals.title;
            
             return applyTemplate('./assets/templates/article.jade', {
             title: title,
             content : html,
             home : homePath
             }).then(function(html) {
                            
                 return saveDoc(file, html);
                            
             })
        })
    });
}

var TEMPLATES = {
        'pattern' : './assets/templates/pattern.jade',
        'example' : './assets/templates/example.jade',
        'index' : './assets/templates/index.jade',
}
function getDocumentTemplate(doc) {
    return Q(TEMPLATES[doc.type]);
}

function applyTemplate(templateFile, doc, patterns){
    var options = _.extend({}, locals, doc, {typogr : typogr, pretty: true, Markdown: Marked, patterns: patterns});
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

function parseYamlNoQ(str) {
    var docs = [];
    yaml.safeLoadAll(str, function(doc) {
        if (!doc)
            return;
        docs.push(doc);
    });
    return docs;
}
