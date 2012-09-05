var util    = require('util'),
    qs      = require('querystring'),
    request = require('request');

API = '/api/json';
NEWJOB = '%s/createItem/?name=%s';
DELETE = '%s/job/%s/doDelete';
BUILD = '%s/job/%s/build';
BUILDWITHPARAMS = '%s/job/%s/buildWithParameters';
CONFIG = '%s/job/%s/config.xml';
JOBINFO = '%s/job/%s' + API;
LIST = '%s' + API;
LAST_SUCCESS = '%s/job/%s/lastSuccessfulBuild' + API;
TEST_REPORT = '%s/job/%s/lastSuccessfulBuild/testReport' + API;
LAST_BUILD = '%s/job/%s/lastBuild' + API;
LAST_REPORT = '%s/job/%s/lastBuild/testReport' + API;
BUILD_WITH_PARAMS = '%s/job/%s/buildWithParameters?%s';


var init = exports.init = function(host) {
   
    // Jenkins variables
    var host = host;
    
    // Helper Functions
    var build_url = function(command) {
        /* Builds REST url to Jenkins */
        
        // Create the url using the format function
        var url = util.format.call(this, command, host);

        // if command is the only arg, we are done
        if (arguments.length == 1) return url;

        // Grab the arguments except for the first (command)
        var args = Array.prototype.slice.call(arguments).slice(1);

        // Append url to front of args array
        args.unshift(url);

        // Create full url with all the arguments
        return util.format.apply(this, args);
    }

    var req = function(urlComponents, opts, callback) {
        var url = build_url.apply(this, urlComponents);
        return request({method: opts.method, url: url}, function(error, response, body) {
            if (error || response.statusCode != 200) {
                callback(error || response);
                return;
            }

            var response = body.toString();
            if (opts.dataType == 'json')
                response = JSON.parse(response);

            callback(null, response);
        });
    };

    var get = function(urlComponents, callback) {
        return req(urlComponents, {method: 'GET'}, callback);
    };

    var post = function(urlComponents, callback) {
        return req(urlComponents, {method: 'POST'}, callback);
    };

    var getJSON = function(urlComponents, callback) {
        return req(urlComponents, {method: 'GET', dataType: 'json'}, callback);
    };

    var postJSON = function(urlComponents, callback) {
        return req(urlComponents, {method: 'POST', dataType: 'json'}, callback);
    };

    return {
        build: function(jobname, callback, params) {
            /*
            Trigger Jenkins to build.
            */
            if (!params) {
                request({method: 'POST', url: build_url(BUILD, jobname)}, function(error, response, body) {
                });
            }else {
                request({method: 'POST', url: build_url(BUILDWITHPARAMS+"?"+qs.stringify(params), jobname)}, function(error, response, body) {
                });
            }

        },

        /**
            Return a list of object literals containing the name and color of all jobs on the Jenkins server
        */
        all_jobs: function(callback) {
            getJSON([LIST], callback);
        },

        /**
            Get all information for a job
        */
        job_info: function(jobname, callback) {
            getJSON([JOBINFO, jobname], callback);
        },

        /**
            Get information for the last build of a job
        */
        last_build_info: function(jobname, callback) {
            getJSON([LAST_BUILD, jobname], callback);
        },

        /**
            Get the last build report for a job
        */
        last_build_report: function(jobname, callback) {
            get([LAST_REPORT, jobname], callback);
        },

        /*
            Get the config xml for a job
        */
        get_config_xml: function(jobname, callback) {
            get([CONFIG, jobname], callback);
        },

        /**
            Create a new job based on a job_config string 
        */
        create_job: function(jobname, job_config, callback) {
            request(
                {method: 'POST' 
                ,url: build_url(NEWJOB, jobname)
                ,body: job_config
                ,headers: { "content-type": "application/xml"}
                }, 
                
                function(error, response, body) {
                    if (response.statusCode != 200 || error){
                        callback(error || true, response);
                        return;
                    }
                    data = body;
                    callback(null, data);
                }
            );
        },

        copy_job: function(jobname, new_job, modifyfunction, callback) {
            /*
            Copies a job and allows you to pass in a function to modify the configuration
            of the job you would like to copy
            */

            var self = this;
            self.get_config_xml(jobname, function(error, data) {
                if (error) {
                    callback(error, data);
                    return;
                }
                self.create_job(new_job, modifyfunction(data), function(error, data) {
                    if (error) {
                        callback(error, data);
                        return;
                    }
                    callback(null, data);
                });
            });

        },

        delete_job: function(jobname, callback) {
            /*
            Deletes a job 
            */
            request({method: 'POST', url: build_url(DELETE, jobname)}, function(error, response, body) {
                if (response.statusCode == 404 || error){
                    callback(error || true, response);
                    return;
                }
                callback(null, body);
            });
            
        },

        /**
            Get the last build report for a job
        */
        last_success: function(jobname, callback) {
            postJSON([LAST_SUCCESS, jobname], callback);
        },

        /**
            Get the last result for a job
        */
        last_result: function(jobname, callback) {
            this.job_info(jobname, function(error, data) {
                if (error) return callback(error);

                last_result_url = data['lastBuild']['url'];
                get([last_result_url + API, jobname], callback);
            });
        },
    }

}
