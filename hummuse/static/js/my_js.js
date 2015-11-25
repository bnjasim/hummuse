/* ========================================================================
 * Bootstrap: modal.js v3.3.4
 * http://getbootstrap.com/javascript/#modals
 * ========================================================================
 * Copyright 2011-2015 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
  'use strict';

  // MODAL CLASS DEFINITION
  // ======================

  var Modal = function (element, options) {
    this.options             = options
    this.$body               = $(document.body)
    this.$element            = $(element)
    this.$dialog             = this.$element.find('.modal-dialog')
    this.$backdrop           = null
    this.isShown             = null
    this.originalBodyPad     = null
    this.scrollbarWidth      = 0
    this.ignoreBackdropClick = false

    if (this.options.remote) {
      this.$element
        .find('.modal-content')
        .load(this.options.remote, $.proxy(function () {
          this.$element.trigger('loaded.bs.modal')
        }, this))
    }
  }

  Modal.VERSION  = '3.3.4'

  Modal.TRANSITION_DURATION = 300
  Modal.BACKDROP_TRANSITION_DURATION = 150

  Modal.DEFAULTS = {
    backdrop: true,
    keyboard: true,
    show: true
  }

  Modal.prototype.toggle = function (_relatedTarget) {
    return this.isShown ? this.hide() : this.show(_relatedTarget)
  }

  Modal.prototype.show = function (_relatedTarget) {
    var that = this
    var e    = $.Event('show.bs.modal', { relatedTarget: _relatedTarget })

    this.$element.trigger(e)

    if (this.isShown || e.isDefaultPrevented()) return

    this.isShown = true

    this.checkScrollbar()
    this.setScrollbar()
    this.$body.addClass('modal-open')

    this.escape()
    this.resize()

    this.$element.on('click.dismiss.bs.modal', '[data-dismiss="modal"]', $.proxy(this.hide, this))

    this.$dialog.on('mousedown.dismiss.bs.modal', function () {
      that.$element.one('mouseup.dismiss.bs.modal', function (e) {
        if ($(e.target).is(that.$element)) that.ignoreBackdropClick = true
      })
    })

    this.backdrop(function () {
      var transition = $.support.transition && that.$element.hasClass('fade')

      if (!that.$element.parent().length) {
        that.$element.appendTo(that.$body) // don't move modals dom position
      }

      that.$element
        .show()
        .scrollTop(0)

      that.adjustDialog()

      if (transition) {
        that.$element[0].offsetWidth // force reflow
      }

      that.$element
        .addClass('in')
        .attr('aria-hidden', false)

      that.enforceFocus()

      var e = $.Event('shown.bs.modal', { relatedTarget: _relatedTarget })

      transition ?
        that.$dialog // wait for modal to slide in
          .one('bsTransitionEnd', function () {
            that.$element.trigger('focus').trigger(e)
          })
          .emulateTransitionEnd(Modal.TRANSITION_DURATION) :
        that.$element.trigger('focus').trigger(e)
    })
  }

  Modal.prototype.hide = function (e) {
    if (e) e.preventDefault()

    e = $.Event('hide.bs.modal')

    this.$element.trigger(e)

    if (!this.isShown || e.isDefaultPrevented()) return

    this.isShown = false

    this.escape()
    this.resize()

    $(document).off('focusin.bs.modal')

    this.$element
      .removeClass('in')
      .attr('aria-hidden', true)
      .off('click.dismiss.bs.modal')
      .off('mouseup.dismiss.bs.modal')

    this.$dialog.off('mousedown.dismiss.bs.modal')

    $.support.transition && this.$element.hasClass('fade') ?
      this.$element
        .one('bsTransitionEnd', $.proxy(this.hideModal, this))
        .emulateTransitionEnd(Modal.TRANSITION_DURATION) :
      this.hideModal()
  }

  Modal.prototype.enforceFocus = function () {
    $(document)
      .off('focusin.bs.modal') // guard against infinite focus loop
      .on('focusin.bs.modal', $.proxy(function (e) {
        if (this.$element[0] !== e.target && !this.$element.has(e.target).length) {
          this.$element.trigger('focus')
        }
      }, this))
  }

  Modal.prototype.escape = function () {
    if (this.isShown && this.options.keyboard) {
      this.$element.on('keydown.dismiss.bs.modal', $.proxy(function (e) {
        e.which == 27 && this.hide()
      }, this))
    } else if (!this.isShown) {
      this.$element.off('keydown.dismiss.bs.modal')
    }
  }

  Modal.prototype.resize = function () {
    if (this.isShown) {
      $(window).on('resize.bs.modal', $.proxy(this.handleUpdate, this))
    } else {
      $(window).off('resize.bs.modal')
    }
  }

  Modal.prototype.hideModal = function () {
    var that = this
    this.$element.hide()
    this.backdrop(function () {
      that.$body.removeClass('modal-open')
      that.$body.find('#my-fixed-top').css('padding-right', '0px');
      that.resetAdjustments()
      that.resetScrollbar()
      that.$element.trigger('hidden.bs.modal')
    })
  }

  Modal.prototype.removeBackdrop = function () {
    this.$backdrop && this.$backdrop.remove()
    this.$backdrop = null
  }

  Modal.prototype.backdrop = function (callback) {
    var that = this
    var animate = this.$element.hasClass('fade') ? 'fade' : ''

    if (this.isShown && this.options.backdrop) {
      var doAnimate = $.support.transition && animate

      this.$backdrop = $('<div class="modal-backdrop ' + animate + '" />')
        .appendTo(this.$body)

      this.$element.on('click.dismiss.bs.modal', $.proxy(function (e) {
        if (this.ignoreBackdropClick) {
          this.ignoreBackdropClick = false
          return
        }
        if (e.target !== e.currentTarget) return
        this.options.backdrop == 'static'
          ? this.$element[0].focus()
          : this.hide()
      }, this))

      if (doAnimate) this.$backdrop[0].offsetWidth // force reflow

      this.$backdrop.addClass('in')

      if (!callback) return

      doAnimate ?
        this.$backdrop
          .one('bsTransitionEnd', callback)
          .emulateTransitionEnd(Modal.BACKDROP_TRANSITION_DURATION) :
        callback()

    } else if (!this.isShown && this.$backdrop) {
      this.$backdrop.removeClass('in')

      var callbackRemove = function () {
        that.removeBackdrop()
        callback && callback()
      }
      $.support.transition && this.$element.hasClass('fade') ?
        this.$backdrop
          .one('bsTransitionEnd', callbackRemove)
          .emulateTransitionEnd(Modal.BACKDROP_TRANSITION_DURATION) :
        callbackRemove()

    } else if (callback) {
      callback()
    }
  }

  // these following methods are used to handle overflowing modals

  Modal.prototype.handleUpdate = function () {
    this.adjustDialog()
  }

  Modal.prototype.adjustDialog = function () {
    var modalIsOverflowing = this.$element[0].scrollHeight > document.documentElement.clientHeight

    this.$element.css({
      paddingLeft:  !this.bodyIsOverflowing && modalIsOverflowing ? this.scrollbarWidth : '',
      paddingRight: this.bodyIsOverflowing && !modalIsOverflowing ? this.scrollbarWidth : ''
    })
  }

  Modal.prototype.resetAdjustments = function () {
    this.$element.css({
      paddingLeft: '',
      paddingRight: ''
    })
  }

  Modal.prototype.checkScrollbar = function () {
    var fullWindowWidth = window.innerWidth
    if (!fullWindowWidth) { // workaround for missing window.innerWidth in IE8
      var documentElementRect = document.documentElement.getBoundingClientRect()
      fullWindowWidth = documentElementRect.right - Math.abs(documentElementRect.left)
    }
    this.bodyIsOverflowing = document.body.clientWidth < fullWindowWidth
    this.scrollbarWidth = this.measureScrollbar()
  }

  Modal.prototype.setScrollbar = function () {
    var bodyPad = parseInt((this.$body.css('padding-right') || 0), 10)
    this.originalBodyPad = document.body.style.paddingRight || ''
    if (this.bodyIsOverflowing) this.$body.css('padding-right', bodyPad + this.scrollbarWidth)
  }

  Modal.prototype.resetScrollbar = function () {
    this.$body.css('padding-right', this.originalBodyPad)
  }

  Modal.prototype.measureScrollbar = function () { // thx walsh
    var scrollDiv = document.createElement('div')
    scrollDiv.className = 'modal-scrollbar-measure'
    this.$body.append(scrollDiv)
    var scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth
    this.$body[0].removeChild(scrollDiv)
    return scrollbarWidth
  }


  // MODAL PLUGIN DEFINITION
  // =======================

  function Plugin(option, _relatedTarget) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.modal')
      var options = $.extend({}, Modal.DEFAULTS, $this.data(), typeof option == 'object' && option)

      if (!data) $this.data('bs.modal', (data = new Modal(this, options)))
      if (typeof option == 'string') data[option](_relatedTarget)
      else if (options.show) data.show(_relatedTarget)
    })
  }

  var old = $.fn.modal

  $.fn.modal             = Plugin
  $.fn.modal.Constructor = Modal


  // MODAL NO CONFLICT
  // =================

  $.fn.modal.noConflict = function () {
    $.fn.modal = old
    return this
  }


  // MODAL DATA-API
  // ==============

  $(document).on('click.bs.modal.data-api', '[data-toggle="modal"]', function (e) {
    var $this   = $(this)
    var href    = $this.attr('href')
    var $target = $($this.attr('data-target') || (href && href.replace(/.*(?=#[^\s]+$)/, ''))) // strip for ie7
    var option  = $target.data('bs.modal') ? 'toggle' : $.extend({ remote: !/#/.test(href) && href }, $target.data(), $this.data())

    if ($this.is('a')) e.preventDefault()

    $target.one('show.bs.modal', function (showEvent) {
      if (showEvent.isDefaultPrevented()) return // only register focus restorer if modal will actually get shown
      $target.one('hidden.bs.modal', function () {
        $this.is(':visible') && $this.trigger('focus')
      })
    })
    Plugin.call($target, option, this)
  })

}(jQuery);









$(document).ready(function(){
	//window.onbeforeunload = function(){


 //---------Home Initial data load------------------//
 /*---------We receive json data from the server
  the  rendering of daily-box div is done in the client side*/
  jsdata = {}; // json/js data stored globally and later on added to it
  var weeks_loaded = 0; // how many weeks have already been rendered 
  var template = $('#template').html();
  var template_projects = $('#template-projects').html();
  var mainContentDiv = $('#json-div');
  // page state can be changed to projects/dash board etc.
  var page_state = 'all';
  var processing = false; // another ajax search is going on
  var p_index = 0; // for timer projects listing
  var projs_arrived = false; // whether projects ajax call returned or not
  var rendered = false; // whether first rendering of main content took place or not
  projs = []; // list of all projects in the order of last accessed field
  projs_dict = {}; // a dictionary with pid as the keys as pname and isprod as values

  // function to extract sentences out of html (string)
  // similar to textContent() function
  var innerSentences = function(html_string){
  	var match, 
  		sentences = [],
  		last_tag_pos = 0,
  		now_tag_pos = 0;
  	var regex = /\<\/*(?:div|li|ul|ol|b|u|i|span style\=\"\")\>/g ; // regular expression
  	while(match = regex.exec(html_string)){
  		now_tag_pos = match.index;
  		if (now_tag_pos > last_tag_pos){
  			var s = html_string.slice(last_tag_pos, now_tag_pos);
  			sentences.push(s);
  		}
  		last_tag_pos = now_tag_pos + match[0].length;
  	}
  	return sentences;
  }

  // input is html  - NO - now changed to a textContent string
  var formShortNotes = function(html_string, note_limit){
  	 /*var sentences = innerSentences(html_string),
  	     words_count = 0,
  	     short_sentence = '';

  	 for(var i=0; i<sentences.length; ++i){
  	 	var s = sentences[i],
  	 		words = s.split(/[.\s]/);

  	 	words_count += words.length;
  	 	if(words_count > note_limit)
  	 		break;
  	 	else if (s.length > 0){
  	 		var stop = '';
  	 		if (s[s.length-1] != '.')
  	 			stop = '.';
  	 		short_sentence += s + stop + ' ';
  	 	}
  	 		
  	 }*/
  	 var short_sentence = html_string.slice(0,note_limit);
  	 return short_sentence + '..<a class="show-more-notes">(more)</a>';
  }


  	var finished_load = function(){

  		if($('#div-load-more')){
  			var a = $('#div-load-more').children();
  			a.text('');
  			a.css('color', '#777');
  			a.css('text-decoration', 'none');
  			a.css('cursor', 'default')
  			a.click(function() {
  				return false;
  			});

  		}
  	}

  	// extract relevant portions of a note to make summary
  	// for the timebeing, just take the first sentence.
  	// was used in weekly summary - not used now!
  	var findSummaryFromNotes = function(note){
  		var regex = /\<\/*(?:div|li|ul|ol|b|u|i|br\/|br|\.|span style\=\"\")\>/;
  		var pos = note.search(regex);
  		var summary = note.slice(0,pos);
  		return summary;
  	}


  	// we want a week to start from Mon
	Date.prototype.getMyDay  = function(){var a = this.getDay() - 1; if (a<0){a=6}; return a}


  	// common to search tag and daily,weekly display 
  	// computes hrs of work, short notes etc..
  	var entry_common_computations = function(entries){

  		var total = 0

  		for(var j=0; j<entries.length; ++j){
  			var entry = entries[j];

  			// if tags is [''] need to change to []
  			var t = entry.tags;
  			if (t.length === 1 && t[0] === "")
  				entry.tags = [];

  			// add hrs to total only if project productive
  			// isproductive automatically implies isWork
  			if(entry['isWork']) {
  				// Get the name from projs_dict
  				//alert(entry.pname);
  				entry.proj = projs_dict[entry.pid]['pname'];
	  			entry.isprod = projs_dict[entry.pid]['isprod'];
	  			if (entry.isprod)
  					total += entry['hrs'];
  			}

  			var hrs = entry['hrs'],
  				h = Math.floor(hrs),
				m = Math.ceil((hrs - h) * 60);
			
			var hour_string = '';
			if (h > 0) {
				if (m > 0)
					hour_string = h + 'h ' + m + 'm';
				else
					hour_string = h + 'h';
			}	
			else if (m > 0)
				hour_string = m + 'm';

			entry['h'] = h;
			entry['m'] = m;
			entry['hrs_string'] = hour_string;
			entry['ishz'] = (h === 0 && m === 0); // only if both are zero

  		}

  		return total;	
  	}

  	var render_content = function(offset){
  		//jsdata = JSON.parse(data); //[{"data": [{"date":date, "entries":[....]}, {} ...]
  		var data = jsdata['data']; // array of dayboxes
  		
  		  	// if weekly, reformat the data to have new dailyboxes 
  			// (actually weeklyboxes) but we will call dailybox itself
  			var formatted_data = data;
  		/*	if (summary_state === 'weekly') {
  				formatted_data = reforamt_data_to_weekly(data);
  				weeks_loaded = formatted_data.length;
  			} */

  			for(var i=offset; i<formatted_data.length; ++i){
  				var daybox = formatted_data[i]; // we are rendering this json/js data structure
  				// reformat to compute total hours, shortnotes etc.
  				var entries = daybox.entries;

  				var total = entry_common_computations(entries); // this alters the entry

  				var totalh = Math.floor(total),
  					totalm = Math.ceil((total - totalh)*60);
  				if(totalh > 0)
  					daybox['totalh'] = totalh;
  				if(totalm > 0)
  					daybox['totalm'] = totalm;
  				// don't display 'Total' if
  				var no_of_work = 0;
  				for (var j=0; j<entries.length; ++j){
  					var e = entries[j];
  					if (e.isWork)
  						no_of_work += 1;
  				}
  				if(no_of_work>1 && (totalh>0 || totalm>0))
  					daybox['totalpresent'] = true;


  				var rendered = Mustache.render(template, daybox);
  				// attach to the DOM
  				// set the date in the date-box
  				$('.date-box').last().html(daybox.date);
  				// insert to the daily-box empty-box for smooth loading without jumps
  				mainContentDiv.find('.empty-box').html(rendered).removeClass('empty-box').addClass('daily-box');
  				mainContentDiv.append('<div class="col-md-8 date-box"></div><div class="clearfix"></div><div class="empty-box"></div>');
  				if (window.MathJax && MathJax.Hub)
  					MathJax.Hub.Queue(["Typeset",MathJax.Hub]);

  			}


			mainContentDiv.find('.empty-box').html('<div id="div-load-more"></div>');
			$('#div-load-more').append('<a class="load-more-click">Load >></a>');
			
  			if (jsdata['more']) {
  				
  				$('a.load-more-click').on('click', function(){
  					// empty and append = html
					$('#div-load-more').html('<img src="static/images/load-small.gif" alt="loading...">');
					make_ajax_call();
				});
			}
			else 
				finished_load();

			set_edit_entry_event_handlers();

	
	}

/*	// date1 - 'Jul 6 2015' date2 - 'Jul 12 2015' return true
	var in_the_same_week = function(date1, date2){
		var week_start_date = new Date(date1),
  			week_end_date = new Date(date1),
  			date2Date = new Date(date2);

  		week_start_date.setDate(week_start_date.getDate() - week_start_date.getMyDay());
  	    week_end_date.setDate(week_end_date.getDate() + 6 - week_end_date.getMyDay());

  	    if (date2Date <= week_end_date && date2Date >= week_start_date)
  	    	return true;
  	    else
  	    	return false;
	}
*/
 	var append_data_and_render = function(received_data){
 		// jsdata is the available global data
 		var offset = 0;
 		var data_new = received_data['data'],
 			data_old = jsdata['data'];

 		if (data_new.length === 0){
 			//if ($('.initial-loading-container'))
 			//	$('.initial-loading-container').remove();
 			// instead of removing set maincontentdiv.html
 			mainContentDiv.html('<div class="col-md-8 date-box"></div><div class="clearfix"></div><div class="empty-box finished load"></div>');
 			finished_load();
 			return;
 		}	

 		if (data_old === undefined) {// initial load
 			jsdata = received_data;
 			// we will postpone rendering if projs not yet retrieved
			if (!projs_arrived) 			
				return;
			rendered = true;
 			//$('.initial-loading-container').remove();
 			mainContentDiv.html('<div class="col-md-8 date-box"></div><div class="clearfix"></div><div class="empty-box"></div>');
 			//console.log('Projects arrived first');
 		}

 		else {

 			jsdata.more = received_data.more;
 			jsdata.cursor = received_data.cursor;
 			
 			var date1 = data_old[data_old.length-1]['date'],
 				date2 = data_new[0]['date'];

 			if (date1 !== date2){
 				// no overlap - just append 
 				jsdata.data = data_old.concat(data_new);

 				if (page_state === 'all')
 					offset = data_old.length;

 			}	

 			else {
 				// merge date-boxes
 				// more difficult - because we have to merge two boxes 
 				var last_date_box = data_old[data_old.length-1]['entries'];
 				var first_date_box = data_new[0]['entries'];
 				var combined_date_box = last_date_box.concat(first_date_box);
 				// now replace the last daybox of jsdata with the combined date-box
 				jsdata.data[data_old.length-1]['entries'] = combined_date_box;
 				// then append the received data to jsdata except for the first day-box
 				jsdata.data = jsdata.data.concat(data_new.slice(1));

 				if (page_state === 'all'){
 					// remove the last daily-box from the DOM
 					$('.daily-box').last().remove();
 					$('.date-box').last().remove();
 					offset = data_old.length - 1;
 				}

 			/*	else if (summary_state === 'weekly'){
 					// just remove last weeklybox and re-render
 					$('.daily-box').last().remove();
 					if (weeks_loaded > 0)
 						offset = weeks_loaded - 1;
 				} */

 			}

 		}

 		render_content(offset);
 		
 	}



 	// main page rendering ajax call
	var make_ajax_call = function(){
		$.ajax({
			url: '/ajaxhome',
			type: 'POST',
			data: {'cursor':jsdata['cursor']},
			dataType: 'json',
			success: function(received_data){
				append_data_and_render(received_data);
			},
			error: function(e){
				alert('Error' + e);
			}
		}); 
	}




	// function to render the search by tag results
	// option 0 indicates search results, 1 indicates project filter result
	var display_search_results = function(search, entity, option){
		
		var results = search['results'];
		
		// main-content-title is appended only in search-button on click event
		if (!results || results.length===0 && !option)
			$('#main-content-title').html('No results found for <b>'+entity+'</b>');
		else if (!option)
			$('#main-content-title').html('Search results for <b>'+entity+'</b>');
			
		// not required as we remove it in success:		
		if ($('.initial-loading-container'))
			$('.initial-loading-container').remove();
		

		for (var i=0; i<results.length; ++i){

			var entrybox = results[i];
			// entrybox similar to daybox - {'entries':[entry]}
  			entry_common_computations(entrybox.entries); // this alters the entry
  			
			var rendered = Mustache.render(template, entrybox);
  			$('.date-box').last().html(entrybox.date);
  			mainContentDiv.find('.empty-box').html(rendered).removeClass('empty-box').addClass('daily-box');
  			mainContentDiv.append('<div class="col-md-8 date-box"></div><div class="clearfix"></div><div class="empty-box"></div>');
  			if (window.MathJax && MathJax.Hub)
  				MathJax.Hub.Queue(["Typeset",MathJax.Hub]);

			
		}
			
		$('a.show-more-notes').on('click', function(){
			$(this).closest('.short-note').css("display", "none");
			$(this).closest('.short-note').siblings('.full-note').css("display", "inline");
		});

		mainContentDiv.find('.empty-box').html('<div id="div-load-more"></div>');
		$('#div-load-more').append('<a class="load-more-click">Load >></a>');
			
  		if (search['more']) {
  			// tag search
  			if (!option) {	
  				$('a.load-more-click').on('click', function(){
  					// empty and append = html
					$('#div-load-more').html('<img src="static/images/load-small.gif" alt="loading...">');
					search_ajax_tag(entity, search['cursor']);
				});
			}
			// achievement search
			else if (option === 1){
				$('a.load-more-click').on('click', function(){
  					// empty and append = html
					$('#div-load-more').html('<img src="static/images/load-small.gif" alt="loading...">');
					//search_ajax_tag(entity, search['cursor']);
					achievements_ajax(search['cursor']);
				});	
			}	
			// project search
			else if (option === 2){
				$('a.load-more-click').on('click', function(){
  					// empty and append = html
					$('#div-load-more').html('<img src="static/images/load-small.gif" alt="loading...">');
					filter_by_project_ajax(entity, search['cursor']);
					//search_ajax_tag(entity, search['cursor']);
				});	
			}	
		}
		else 
			finished_load();

		set_edit_entry_event_handlers();

	}

	// It's very important that cursor is None for the first call
	// using search['cursor'] can be problematic
	var search_ajax_tag = function(tag, cursor){
		ntag = tag.toLowerCase().replace(/ /g, '')
		processing = true;
		$.ajax({
			url: '/searchtags',
			type: 'POST',
			data: {'tag': ntag, 'cursor': cursor},
			dataType: 'json',
			success: function(search_results){
				if (!cursor) {
					// initially, empty the maincontent again to remove the loading-gif
					// As well as to avoid any potential conflicts between any two ajax requests
					//mainContentDiv.empty();
					mainContentDiv.html('<div id="main-content-title"></div></div><div class="col-md-8 date-box"></div><div class="clearfix"></div><div class="empty-box"></div>');
				}	
				display_search_results(search_results, tag, 0);
				processing = false;
			},
			error: function(e){
				alert('Server Error: Search Failed' + e);
			}
		}); 
	}

	var min = function(a,b){
		return a<b?a:b;

	}

	// render the retrieved projects in the div in left panel
	var list_projects_panel = function() {
		var pro_limit = 6;

		var ul = $('#projects-panel').find('.left-panel-ul');
		ul.empty();
		ul.append('<li><a class="left-panel-link-highlight">All</a></li>');
		for(var i=0; i<min(projs.length,pro_limit); ++i) {
			var p = projs[i];
			ul.append('<li><a data-pid=' + p.projectId + '>' + projs_dict[p.projectId]['pname']+'</a></li>');
		}

		if (projs.length > pro_limit){
			ul.append('<div id="load-more-projects-div"><a id="load-more-projects"> +More+</a></div>');
			$('#load-more-projects').on('click', function(){
				for(i=pro_limit; i<projs.length; ++i){
					$('#load-more-projects').css('display', 'none');
					var p = projs[i];
					ul.append('<li><a data-pid=' + p.projectId + '>' + projs_dict[p.projectId]['pname'] +'</a></li>');
				}

			});
		}
	}

	// return all projects in last accessed first order
	// called only once - initially, otherwise double check everything is ok.
	var ajax_projects = function(){

		$.ajax({
			url: '/ajaxprojects',
			type: 'GET',
			dataType: 'json',
			success: function(projects){
				
				projs = projects.pbox;
				projs_dict = projects.pdict;
				projs_arrived = true; // initial loading means can't use projs.length === 0
				// show the projects in the left panel
				list_projects_panel();

				// Tips for new users
				if (projs.length == 0){
					welcome_new_users();
				}
				else{
					// if jsdata is set but not yet rendered, render now
					// not yet rendered because ajax_projects was delayed
					if (!rendered && jsdata['data']) {
						//$('.initial-loading-container').remove();
 						mainContentDiv.html('<div class="col-md-8 date-box"></div><div class="clearfix"></div><div class="empty-box"></div>');
 						rendered = true; // not important to set
	 					render_content(0);
 						//console.log('Projects arrived last');
					}

					// Also show in the work modal form Why?
					// Because we may click on the add work modal before data arrives
					// in that case projects will be filled as soon as it arrives
					list_projects_work_form();
					set_edit_projects_modal();

				}	
					

			},
			error: function(e){
				alert('Server Error: Project Retrieval Failed' + e);
			}
		}); 
	}

    // make ajax call only from home page
    if (mainContentDiv.length > 0){ // if $(#json-div) is present
		make_ajax_call();
		ajax_projects();
	}


/*	var ajax_not_fired = true;
	$(window).scroll(function(){
		if(ajax_not_fired){
			if( $(window).height() + $(document).scrollTop() ===  $(document).height() ){
				ajax_not_fired = false;
				$('.loading-gif').css('display', 'block');

				$.ajax({
					url: '/ajaxjson',
					type: 'GET',
					dataType: 'json',
					success: function(data){
						$('.daily-box').last().after($('<div>', {text: data['name']}));
						$('.loading-gif').css('display', 'none');
					},
					error: function(e){
						alert('Error' + e);
					}
				});
			}
		}
	});
*/

	/********** Searching Tags ***************/
	/****************************************/
	// trigger submit by pressing enter in the input area
	// keyup better than keydown because it avoids multiple submissions (not sure though)
	$('#search-input').keyup( function(event){
		if (event.keyCode === 13){
			$('#search-button').click();
		}
	});
	// prevent default bootstrap behavior of submiting the form 
	// when pressed enter
	$('form input').keydown(function(event){
    	if(event.keyCode == 13) {
      		event.preventDefault();
  		//  return false;
    	}
  	});

  	$('#search-button').click(function(){
  		var tag = $('#search-input').val();
  		tag = tag.trim();
  		if (tag && !processing){
  			// make sure that there is already no ajax request running behind the scenes
  			//mainContentDiv.empty();
			//summary_state = 'search';
			mainContentDiv.html('<div id="main-content-title"><div class="empty-box"></div><div class="initial-loading-container"> <div class="initial-loading-gif"><img src="static/images/load-big.gif" alt="loading..." width="100%" height="100%"></div></div>')
  			search_ajax_tag(tag);
  		}
  	});

  		// filter by projects
	// on() works for dynamically added contents  but click() doesn't
	// shouldn't be invoked for ...show all which doesn't have an li
	$('#projects-panel').on('click', 'li a', function(){
		$('#projects-panel').find('.left-panel-link-highlight').removeClass('left-panel-link-highlight');//remove hightlight first
		//$('#summary-panel').find('.left-panel-link-highlight').removeClass('left-panel-link-highlight');//remove hightlight first
		$(this).addClass('left-panel-link-highlight');	
		var pid = $(this).data('pid');
		var pname = $(this).text();
		//alert(project+' '+pid);
		if(!pid) { // or project === 'All'
			if (jsdata['data']) {// don't do anything before first data has arrived
				//mainContentDiv.empty();
				mainContentDiv.html('<div class="col-md-8 date-box"></div><div class="clearfix"></div><div class="empty-box"></div>');
				render_content(0);
			}
		}
		else {
			//mainContentDiv.empty();
			//page_state = 'search';
			mainContentDiv.html('<div class="empty-box"></div><div class="initial-loading-container"> <div class="initial-loading-gif"><img src="static/images/load-big.gif" alt="loading..." width="100%" height="100%"></div></div>')
			//search_ajax_tag(pname);
			filter_by_project_ajax(pid);
		}

		//return false; // prevent default propagation
	});

	$('#star-panel').on('click', 'a', function(){
		if (!processing) {
			//mainContentDiv.empty();
			//page_state = 'search';
			mainContentDiv.html('<div class="empty-box"></div><div class="initial-loading-container"> <div class="initial-loading-gif"><img src="static/images/load-big.gif" alt="loading..." width="100%" height="100%"></div></div>')
			achievements_ajax();
		}
	});


	// It's very important that cursor is None for the first call
	var filter_by_project_ajax = function(pid, cursor) {
		
		processing = true;
		$.ajax({
			url: '/filterproject',
			type: 'POST',
			data: {'pid':pid, 'cursor':cursor},
			dataType: 'json',
			success: function(search_results){
				if (!cursor) {
					// initially, empty the maincontent again to remove the loading-gif
					// As well as to avoid any potential conflicts between two ajax requests
					//mainContentDiv.empty();
					mainContentDiv.html('<div id="main-content-title"></div><div class="col-md-8 date-box"></div><div class="clearfix"></div><div class="empty-box"></div>');
				}	
				results = search_results;
				display_search_results(search_results, pid, 2); // option 2 
				processing = false;
			},
			error: function(e){
				alert('Server Error: Search Failed' + e);
			}
		}); 

	}
	
	
	// It's very important that cursor is None for the first call
	// using search['cursor'] can be problematic
	var achievements_ajax = function(cursor) {
		
		processing = true;
		$.ajax({
			url: '/achievementsajax',
			type: 'POST',
			data: {'cursor':cursor},
			dataType: 'json',
			success: function(search_results){
				if (!cursor) {
					// initially, empty the maincontent again to remove the loading-gif
					// As well as to avoid any potential conflicts between two ajax requests
					//mainContentDiv.empty();
					mainContentDiv.html('<div id="main-content-title"></div><div class="col-md-8 date-box"></div><div class="clearfix"></div><div class="empty-box"></div>');
				}	
				display_search_results(search_results, 'achievements', 1); // option 1 
				processing = false;
			},
			error: function(e){
				alert('Server Error: Search Failed' + e);
			}
		}); 

	}


//----------------Projects--------------------//

	var alreadyExistingProject = function(p){
		// check if p is present in projs
		// convert p is already in lowercase no spaces
		for (var i=0; i<projs.length; ++i){
			var proj = projs_dict[projs[i].projectId]['pname'].toLowerCase().trim().replace(/ /g, '');
			if (p === proj)
				return true;
		}

		return false;
	}

	$('#add-project-cancel').click(function(){
		// remove 17px padding from my-fixed-top navbar
		$('#add-project-modal').modal('hide');
		// It's a hack to correspond to TRANSITION_DURATION time bootstrap.js modal transition
		//setTimeout(function(){
		//	$('#my-fixed-top').css('padding-right', '0px')}, 400);
	});

	$('#add-project-close').click(function(){
		$('#add-project-cancel').click();
	});


	// On submit disable the button
	// error handling and then submitting
 	$('#add-project-submit').on('click', function(){

 		var projectName = $('#add-project-input').val().trim().replace(/\s+/g, ' ');
 		var p = projectName.replace(/ /g, '').toLowerCase();
 		// if projectName is not empty or not too long
 		if (p.length > 0 && p.length <= 40){
 			// check if project name already exists in projs
 			if (!alreadyExistingProject(p)){
 				$('#add-project-footer-div').css('left', '40%');
 				$('#add-project-footer-div').html('<img src="static/images/load-small.gif" alt="processing...">');
	 			$(this).prop('disabled', true);
 				$('#add-project-cancel').prop('disabled', true);
 				$('#add-project-close').prop('disabled', true);
 				// retrieve data and submit using ajax
 				var projectDescription = $('#add-project-description').val();
 				// need to use javascript for checked property - jquery doesn't seem to work
 				var projectProductive = $('#add-project-productive')[0].checked; // true or false
 	
 				$.ajax({
					url: '/addproject',
					type: 'POST',
					dataType: 'json',
					data: {'pname':projectName, 'pdesc':projectDescription, 'isprod':projectProductive},
					success: function(res){
						$('#add-project-submit').prop('disabled', false);
 						$('#add-project-cancel').prop('disabled', false);
 						$('#add-project-close').prop('disabled', false);
 						var fdiv = $('#add-project-footer-div').css('left', '10px');
 						if (res.response > 0) // already exists
 							fdiv.html("<span class='glyphicon glyphicon-remove-circle'></span>Project Already Exists");
 						
 						else { // success
 							// empty projectName and description
 							$('#add-project-input').val('');
 							$('#add-project-description').val('');
 							$('#add-project-productive')[0].checked = true;

 							// display success message at the footer and close the modal
 							fdiv.html("<span class='glyphicon glyphicon-ok-circle'></span>Project Added Successfully").find('span').css('color','green');
 							setTimeout(function(){ $('#add-project-modal').modal('hide'); }, 1200);
 							// remove 17px padding from my-fixed-top navbar
 							//$('#my-fixed-top').css('padding-right', '0px');
 							
 							var new_project = res.project;
 							var new_proj = res.proj;
 							projs = [new_proj].concat(projs); // updated the projs
 							projs_dict[new_proj['projectId']] = new_project;
 							list_projects_panel();
 							list_projects_work_form();
 							p_index += 1; 
							
 							

 						}

					},
					error: function(e){
						$('#add-project-footer-div').css('left', '10px').html("<span class='glyphicon glyphicon-remove-circle'></span>Error: Couldn't add the Project");						
					}
				}); 
 			}
 			else{	
 				$('#add-project-footer-div').html("<span class='glyphicon glyphicon-remove-circle'></span>Project Name already exists");	
 			}
 		}

 		else if (p.length === 0){
 			$('#add-project-footer-div').html("<span class='glyphicon glyphicon-remove-circle'></span>Project Name can't be empty");
 		}
 		else
 			$('#add-project-footer-div').html("<span class='glyphicon glyphicon-remove-circle'></span>Project Name can't more than 40 characters");	
 	});

 	$('#add-project').on('click', function(){
 		$('#add-project-footer-div').empty(); // remove warnings from modal
		$('#add-project-modal').modal({backdrop:'static', keyboard:false});
		// whenever modal is opened add 17px padding-right to my-fixed-top to prevent it jumping
		$('#my-fixed-top').css('padding-right', '17px');
	});





   // ------ EDIT Projects ------------------//
	$('#edit-projects').on('click', function(){
		set_edit_projects_modal();
		$('#edit-projects-footer-div').empty();
		$('#edit-projects-modal').modal({backdrop:'static', keyboard:false});
		// whenever modal is opened add 17px padding-right to my-fixed-top to prevent it jumping
		$('#my-fixed-top').css('padding-right', '17px');
	});

	// paste content - only copy the text not the styling
	$(document).on('paste','[contenteditable]',function(e) {
    	e.preventDefault();
    	var text = (e.originalEvent || e).clipboardData.getData('text/plain') || prompt('Paste something..');
    	window.document.execCommand('insertText', false, text);
    	// if inside project-title - clear the field
    	if ($(this).attr('class') === 'edit-projects-title'){
    		$(this).html('');
    	}
	});

	// prevent drag and drop text
	$(document).on('drop','[contenteditable]',function(e) {
    	e.preventDefault();
    	//var text = (e.originalEvent || e).clipboardData.getData('text/plain') || prompt('Paste something..');
    	//window.document.execCommand('insertText', false, text);
	});	

	// prevent inserting div on enter in contenteditable
	//$('div[contenteditable]').keydown(function(e) {
    	// trap the return key being pressed
   // 	if (e.keyCode === 13) {
      	// insert 2 br tags (if only one br tag is inserted the cursor won't go to the next line)
    //  	document.execCommand('insertHTML', false, '<br><br>');
      	// prevent the default behaviour of return key pressed
     // 	return false;
    //	}
  	//});
	var edited_projects = []; 
	var set_edit_projects_modal = function(){
		// need to create pbox to send to the template
		var pbox = [];
		for (var i=0; i<projs.length; ++i){
			var proj = projs_dict[projs[i]['projectId']];
			pbox.push({'pid':projs[i].projectId, 'pname':proj.pname, 'pdesc':proj.pdesc, 'isprod':proj.isprod});
		}
		var rendered = Mustache.render(template_projects, {'pbox': pbox});	
		edited_projects = []; // reset every time edit modal is shown
		//console.log(rendered);
		$('#edit-projects-modal').find('.modal-body').html(rendered);

		// set the event listeners
		// To rename a project - shouldn't allow more than 40 characters
		$('.edit-projects-display-div').find('ul.dropdown-menu li.edit-projects-rename').on('click', 'a', function(){
			console.log('edit project name');
			var p = $(this).parent().parent().parent().parent();
			var pid = p.attr('id');
			if (edited_projects.indexOf(pid) < 0) 
				edited_projects.push(pid);
			//alert(p.find('.edit-projects-title').text());
			var title = p.find('.edit-projects-title');
			title.attr('contenteditable', 'true');
			title.focus();
		});

		// if pressed enter inside edit-projects-title contenteditable div, exit it
		$('.edit-projects-title').keydown(function(event){
			if(event.keyCode === 13)
				$(this).attr('contenteditable', 'false');
		});

		/*// more than 40 character 
		$('.edit-projects-title').keydown(function(event){
			//alert($(this).text());
			var t = $(this).text();
			if(t.length >= 40){
				if (event.keyCode !== 8){
				  alert('Project Name exceeds 40 characters!');
				  $(this).text(t.slice(0,40));
			    } 	
			}
		});		*/
		// more than 40 character 
		$('.edit-projects-title').keyup(function(event){
			//alert($(this).text());
			var t = $(this).text();
			if(t.length >= 40){
				if (event.keyCode !== 8){
				  alert('Project Name exceeds 40 characters!');
				  $(this).text(t.slice(0,40));
			    } 	
			}
		});		

		// To change the description of a project
		$('.edit-projects-display-div').find('ul.dropdown-menu li.edit-projects-change-desc').on('click', 'a', function(){
			var p = $(this).parent().parent().parent().parent();
			var pid = p.attr('id');
			if (edited_projects.indexOf(pid) < 0) 
				edited_projects.push(pid);
			//alert(p.find('.edit-projects-title').text());
			var desc = p.find('.edit-projects-description');
			desc.attr('contenteditable', 'true');
			desc.focus();
		});
		
		// To change productivity true/false
		$('.edit-projects-display-div').find('ul.dropdown-menu li.edit-projects-set-prod').on('click', 'a', function(){
			var p = $(this).parent().parent().parent().parent();
			var pid = p.attr('id');
			if (edited_projects.indexOf(pid) < 0) 
				edited_projects.push(pid);
			//alert(p.find('.edit-projects-title').text());
			var prod = p.find('.edit-projects-set-prod');
			if (prod.data('prod')){
				prod.data('prod', false);
				prod.html('<a><div class="glyphicon glyphicon-ok edit-projects-dropdown-icon"></div>Set as Productive </a>')
				p.find('.edit-projects-productive').addClass('unproductive').text('Unproductive');
			}
			else{
				prod.data('prod', true);
				prod.html('<a><div class="glyphicon glyphicon-remove edit-projects-dropdown-icon"></div>Set as Unproductive </a>');
				p.find('.edit-projects-productive').removeClass('unproductive').text('Productive');
			}

		});		

	}

	$('#edit-projects-submit').on('click', function(){
		// only if some projects need to be changed
		if (edited_projects.length > 0){
  			var fdiv = $('#edit-projects-footer-div');
  			$(this).prop('disabled', true); // disable the button
  			fdiv.css('left', '45%');
 			fdiv.html('<img src="static/images/load-small.gif" alt="processing...">');
 			$('#edit-projects-cancel').prop('disabled', true);
 			$('#edit-projects-close').prop('disabled', true);

 			// collect all projects that need to be sumbitted for update
 			var edprojs = [];

 			for(var i=0; i<edited_projects.length; ++i){
 				var pid = edited_projects[i];
 				var display_div = $('#'+pid);
 				var pname = display_div.find('.edit-projects-title').text().trim().replace('\n','');
 				console.log(pname);
 				var pdesc = display_div.find('.edit-projects-description').text().trim();
 				var isprod = display_div.find('.edit-projects-set-prod').data('prod');

 				edprojs.push({'pid':pid, 'pname':pname, 'pdesc':pdesc, 'isprod':isprod});
 			}

 			// ajax call to POST the edited projects
 			console.log('ajax post to edit projects');
 			$.ajax({

				url: '/editprojs',
				type: 'POST',
				dataType: 'json',
				data: {'editedprojs': JSON.stringify(edprojs)},
				success: function(res){
					$('#edit-projects-submit').prop('disabled', false);
 					$('#edit-projects-cancel').prop('disabled', false);
 					$('#edit-projects-close').prop('disabled', false);
 					
 					fdiv.css('left', '10px');
 					if (res.response) {// success
 						// display success message at the footer and close the modal
 						fdiv.html("<span class='glyphicon glyphicon-ok-circle'></span>Edits Saved Successfully").find('span').css('color','green');
 						setTimeout(function(){ $('#edit-projects-modal').modal('hide'); }, 1200);

 						// update projs_dict for each edited project
 						for (var i=0; i<edprojs.length; ++i) {
 							var e = edprojs[i];
 							projs_dict[parseInt(e.pid, 10)] = {'pname':e.pname, 'pdesc':e.pdesc, 'isprod':e.isprod, 'pactive':true, 'pshared':false, 'plasthour':0, 'pentriesno':0};
 						}
 						// update the side pane projects list
 						list_projects_panel();

 						// refresh the main content div
 						mainContentDiv.html('<div class="col-md-8 date-box"></div><div class="clearfix"></div><div class="empty-box"></div>');
						render_content(0);

 					}	
 				},

 				error: 	function(error){ 
 					fdiv.html("<span class='glyphicon glyphicon-ok-circle'></span>Server Error! Couldn't edit").css('left', '10px');
 				}
 			});	
 						
 		}

 		else{
 			$('#edit-projects-footer-div').html("<span class='glyphicon glyphicon-ok-circle'></span>No Changes to Save").find('span').css('color','green');
 			setTimeout(function(){ $('#edit-projects-modal').modal('hide'); }, 1200);
 		}
	});


 	//--------END of Projects---------------------//



//---------------- Data Entry ----------------------------//

   $('#add-work').on('click', function(){
 		$('#add-work-footer-div').empty(); // remove warnings from modal
		$('#add-work-modal').modal({backdrop:'static', keyboard:false});
		setDateInModal();
		// whenever modal is opened add 17px padding-right to my-fixed-top to prevent it jumping
		$('#my-fixed-top').css('padding-right', '17px');
		var s = $('#form-work-star');
		s.find('div').removeClass('glyphicon-star');
		s.find('div').addClass('glyphicon-star-empty');
		s.data('value', false);
		if (projs.length > 0)
			list_projects_work_form();
	});

   $('#add-work-cancel').click(function(){
		// remove 17px padding from my-fixed-top navbar
		$('#add-work-modal').modal('hide');
		// It's a hack to correspond to TRANSITION_DURATION time bootstrap.js modal transition
		// Still flickering -so copied whole modal from bootstrap.js and added the code there
		//setTimeout(function(){
		//	$('#my-fixed-top').css('padding-right', '0px')}, 400);
	});

   
	$('#add-work-close').click(function(){
		$('#add-work-cancel').click();
	});

	$('#add-event').on('click', function(){
 		$('#add-event-footer-div').empty(); // remove warnings from modal
		$('#add-event-modal').modal({backdrop:'static', keyboard:false});
		setDateInModal();
		// whenever modal is opened add 17px padding-right to my-fixed-top to prevent it jumping
		$('#my-fixed-top').css('padding-right', '17px');
		var s = $('#form-event-star');
		s.find('div').removeClass('glyphicon-star');
		s.find('div').addClass('glyphicon-star-empty');
		s.data('value', false);
	});

   $('#add-event-cancel').click(function(){
		// remove 17px padding from my-fixed-top navbar
		$('#add-event-modal').modal('hide');
		// It's a hack to correspond to TRANSITION_DURATION time bootstrap.js modal transition
		//setTimeout(function(){
		//	$('#my-fixed-top').css('padding-right', '0px')}, 400);
	});

	$('#add-event-close').click(function(){
		$('#add-event-cancel').click();
	});

	// set the projects in the client side work form modal
	// called after the ajax call for the list of all projects
	var list_projects_work_form = function(){
		// we have projs	
	    var work_form_dropdown_menu = $('#project-form-button').siblings('.project-dropdown-menu');
	    work_form_dropdown_menu.empty();
  		// Execute the code only for data.html not for project.html etc.
  		if(work_form_dropdown_menu[0]) {
  			var b = $('#project-form-button');
  			var projectName = projs_dict[projs[0].projectId]['pname'];

    		b.html(projectName+'<span class="caret">');
    		b.data('pid', projs[0].projectId);
    		//b.data('pname', projectName);
    		//b.data("isprod", projs[0].projectProductive);

    		// set the initial tag as the first project name
    		var t = '<div class="tags-added">'+projectName+'</div>',
		  		ts = $('#tag-section');
		  	ts.empty();	
		  	ts.prepend(t);
		  	ts.data('tags', [projectName]);
		  	
    		for(var j=0; j<projs.length; ++j){
  	  			var temp_li = $(document.createElement("li"));
  	  			var temp_a = $(document.createElement("a"));
  	  			temp_a.text(projs_dict[projs[j].projectId]['pname']); 
  	  			temp_a.data('pid', projs[j].projectId);
  	  			//temp_a.data('pname', projs[j].projectName);
  	  			//temp_a.data('isprod', projs[j].projectProductive);
  	  			
  	  			temp_li.append(temp_a);
  	  			work_form_dropdown_menu.append(temp_li);
    		}

		}
	}


  	//-------- Fill the current date and previous 7 dates in data and event
  	// Do it everytime modal is opened - important otherwise it may show last day---------------//
  	var setDateInModal = function(){
  		var date = new Date(); // today
  		var data_form_dropdown_menu = $('#date-form-button').siblings('.select-dropdown-menu')[0],
  			event_form_dropdown_menu = $('#date-form-button-event').siblings('.select-dropdown-menu')[0];
  		// Execute the code only for data.html not for project.html etc.
  		if(data_form_dropdown_menu) {
    		$('#date-form-button').html(date.toDateString() + ' - Today'+'<span class="caret">');
    		$('#date-form-button-event').html(date.toDateString() + ' - Today'+'<span class="caret">');
    		// need to clear the dates in dropdown
    		$(data_form_dropdown_menu).empty();
    		$(event_form_dropdown_menu).empty();

    		for(var j=0; j<7; ++j){
  	  			var temp_li = document.createElement("li");
  	  			var temp_a = document.createElement("a");
  	  			temp_a.textContent = date.toDateString(); // Wed Jun 24 2015 format
	  	  		if(j===0)
 		 			temp_a.textContent += ' - Today';

	  	  		date.setDate(date.getDate()-1); // find previous date

	  	  		temp_li.appendChild(temp_a);
  		  		data_form_dropdown_menu.appendChild(temp_li);
  	  			event_form_dropdown_menu.appendChild(temp_li.cloneNode(true)); // deep copy
    		}
  		}
  	}	


    // for changing text in dropdown button
    // but this should come only after setting dates in the form in data and event
   	// not necessary as we are using on('a') rather than click() function
    $('.select-dropdown-menu').on('click', 'a', function(){   //hack for mobiles included
    	  $(this).parent().parent().parent().find('button')
    	  	.html($(this).html() + '<span class="caret"></span>');    
		});



    // only after setting projects in the form after ajax success
    $('.project-dropdown-menu').on('click', 'a', function(){   //we need to copy data-pid aswell
    	  var b = $(this).parent().parent().parent().find('button');
    	  b.html( $(this).html() + '<span class="caret"></span>' );    
    	  b.data( 'pid', $(this).data('pid') );
    	  //b.data('pname', $(this).data('pname'));
    	  //b.data('isprod', $(this).data('isprod'));
    	  //alert(b.data('pname'));
    	  var tag = $(this).text(),
    	  	  t = '<div class="tags-added">'+tag+'</div>',
		  	  ts = $('#tag-section');
		 
		  	var tag_data = ts.data('tags'); // This is a list. Initially []
		  	ts.find('.tags-added')[0].remove(); // remove the first one - project name
		  	ts.prepend(t);
		  	tag_data = [tag].concat(tag_data.slice(1));
		  	ts.data('tags', tag_data);
    	  //$('#tag-section').html('<div class="tags-added">'+tag+'</div>')
		});

 

		
		// for changing star colour in data entry
		$('#form-work-star').on('click', function(){
		  $(this).find('div').toggleClass('glyphicon-star-empty');
		  $(this).find('div').toggleClass('glyphicon-star');
		  var star = $('#form-work-star'); // jquery object
		  if ( star.data('value') === true )
		  	star.data('value', false); // star set to unselected
		  else 
		  	star.data('value', true);
		});
		// for changing star colour in event entry
		$('#form-event-star').on('click', function(){
		  $(this).find('div').toggleClass('glyphicon-star-empty');
		  $(this).find('div').toggleClass('glyphicon-star');
		  var star = $('#form-event-star'); // jquery object
		  if ( star.data('value') === true )
		  	star.data('value', false); // star set to unselected
		  else 
		  	star.data('value', true);
		});
		// for changing star colour in edit entry
		$('#form-edit-entry-star').on('click', function(){
		  $(this).find('div').toggleClass('glyphicon-star-empty');
		  $(this).find('div').toggleClass('glyphicon-star');
		  var star = $('#form-edit-entry-star'); // jquery object
		  if ( star.data('value') === true )
		  	star.data('value', false); // star set to unselected
		  else 
		  	star.data('value', true);
		});


		// simulate button click by pressing Enter
		$('#tag-input-text').keyup(function(event){
			if(event.keyCode === 13)
				$('#add-tag-button').click();
		});

		$('#event-tag-input-text').keyup(function(event){
			if(event.keyCode === 13)
				$('#event-add-tag-button').click();
		});

		$('#edit-entry-tag-input-text').keyup(function(event){
			if(event.keyCode === 13)
				$('#edit-entry-add-tag-button').click();
		});

		// function to find whether a string is present in a list
		// case insensitive findtag(["binu", "jasim"], BiNu) => true
		var findtag = function(a, query){
			var q = query.toLowerCase();
			for(var i=0; i<a.length; ++i){
				if(a[i].toLowerCase() === q) 
					return i+1;
				// returns +1 because if pos==0 it's interpreted as not found
			}
			return 0;
		}

		// Add tag
		$('#add-tag-button').on('click', function(){
		  var tag = $('#tag-input-text').val();
		  $('#tag-input-text').val("");

		  if(tag.trim().length > 0){
		  	var t = '<div class="tags-added"><span>'+tag+'</span><a class="tag-remove">&times</a></div>';
		  	var ts = $('#tag-section');
		 
		  	var tag_data = ts.data('tags'); // This is a list. Initially []
		  	if (tag_data.length > 9) alert('Cannot add anymore tags!');
		  	else {
		  		// No repeated tags allowed!
		  		if(findtag(tag_data, tag))
		  			return false;
		  		ts.append(t);
		  		tag_data.push(tag);
		  		ts.data('tags', tag_data);
		  	}
		  }
		  return false; // To prevent page popping to the top
		});

		// remove tag from work
		$('#tag-section').on('click', 'a.tag-remove', function(){
			var tag = $(this).parent().find('span').text();
			$(this).parent().remove(); // parent of .tag-remove is .tags-added
			// remove it from the data-tags as well
			var ts = $('#tag-section'),
				data = ts.data('tags');

			var pos = findtag(data, tag) - 1;
			if (pos > 0)  // we will never remove first one
				ts.data('tags', data.slice(0, pos).concat(data.slice(pos+1)));

			else if(pos = findtag(data.slice(1), tag)) // but same project name can appear later
				ts.data('tags', data.slice(0, pos).concat(data.slice(pos+1)));				
				
		});

		// Add tag for event
		$('#event-add-tag-button').on('click', function(){
		  var tag = $('#event-tag-input-text').val();
		  $('#event-tag-input-text').val("");

		  if(tag.trim().length > 0){
		  	var t = '<div class="tags-added"><span>'+tag+'</span><a class="tag-remove">&times</a></div>',
		  	    ts = $('#event-tag-section');
		 
		  	var tag_data = ts.data('tags'); // This is a list. Initially []
		  	if (tag_data.length > 9) alert('Cannot add anymore tags!');
		  	else {
		  		// No repeated tags allowed!
		  		if(findtag(tag_data, tag))
		  			return false;
		  		ts.append(t);
		  		tag_data.push(tag);
		  		ts.data('tags', tag_data);
		  	}
		  }
		  return false; // To prevent page popping to the top
		});

		// remove tag from event
		$('#event-tag-section').on('click', 'a.tag-remove', function(){
			var tag = $(this).parent().find('span').text();
			$(this).parent().remove(); // parent of .tag-remove is .tags-added
			// remove it from the data-tags as well
			var ts = $('#event-tag-section'),
				data = ts.data('tags');

			var pos = findtag(data, tag) - 1;
			if (pos > 0)  // we will never remove 'event'
				ts.data('tags', data.slice(0, pos).concat(data.slice(pos+1)));
				
		});
		
		// Add tag for edit entry
		$('#edit-entry-add-tag-button').on('click', function(){
		  var tag = $('#edit-entry-tag-input-text').val();
		  $('#edit-entry-tag-input-text').val("");

		  if(tag.trim().length > 0){
		  	var t = '<div class="tags-added"><span>'+tag+'</span><a class="tag-remove">&times</a></div>',
		  	    ts = $('#edit-entry-tag-section');
		 
		  	var tag_data = ts.data('tags'); // This is a list. Initially []
		  	if (tag_data.length > 9) alert('Cannot add anymore tags!');
		  	else {
		  		// No repeated tags allowed!
		  		if(findtag(tag_data, tag))
		  			return false;
		  		ts.append(t);
		  		tag_data = tag_data.concat(tag);
		  		ts.data('tags', tag_data);
		  	}
		  }
		  return false; // To prevent page popping to the top
		});

		// remove tag from event
		$('#edit-entry-tag-section').on('click', 'a.tag-remove', function(){
			var tag = $(this).parent().find('span').text();
			$(this).parent().remove(); // parent of .tag-remove is .tags-added
			// remove it from the data-tags as well
			var ts = $('#edit-entry-tag-section'),
				data = ts.data('tags');

			var pos = findtag(data, tag) - 1;
			if (pos > 0)  // we will never remove 'event'
				ts.data('tags', data.slice(0, pos).concat(data.slice(pos+1)));
				
		});


	

  // Begin Form submission in Data through javascript //
  //--------------------------------------------------//
  // For Work
  $('#add-work-submit').on('click', function(){
  	$(this).prop('disabled', true); // disable the button
  	$('#add-work-footer-div').css('left', '45%');
 	$('#add-work-footer-div').html('<img src="static/images/load-small.gif" alt="processing...">');
 	$('#add-work-cancel').prop('disabled', true);
 	$('#add-work-close').prop('disabled', true);

  	var input1 = "work";
 	// input2 is project id
  	var input2 = $('#project-form-button').data('pid');
   	// project name
  	//var input21 = $('#project-form-button').data('pname');
  	// is project productive - to avoid datastore access
  	//var input22 = $('#project-form-button').data('isprod');
  	// date
  	var input3 = $('#date-form-button').text().slice(0,15);
  	// hours
  	var input4 = $('#form-working-hours').text();
	// minutes
  	var input5 = $('#form-working-minutes').text();
  	// Achievement Star
  	var input6 = $('#form-work-star').data('value');
	// Notes textarea-div
  	var input7 = $('#notes-form').removeTrailingDivs().html();
  	// Tags
  	var input8 = $('#tag-section').data('tags'); // an array
  
  	var data = {'formkind':input1, 'pid':input2, //'pname':input21, 'isprod':input22,
  				'date':input3, 'hours':input4, 'minutes':input5, 'achievement':input6,
  				'notes':input7, 'tags':JSON.stringify(input8) };
	$.ajax({

		url: '/makeentry',
		type: 'POST',
		dataType: 'json',
		data: data,
		success: function(res){
			$('#add-work-submit').prop('disabled', false);
 			$('#add-work-cancel').prop('disabled', false);
 			$('#add-work-close').prop('disabled', false);
 			var fdiv = $('#add-work-footer-div').css('left', '10px');

 			if (res.response > 0) // already exists
 				// duplicate entry	
				fdiv.html("<span class='glyphicon glyphicon-ok-circle'></span>You have already made an entry in "+ $('#project-form-button').text()+" on "+input3+"! Please Edit that");
 						
 			else { // success
 				// display success message at the footer and close the modal
 				fdiv.html("<span class='glyphicon glyphicon-ok-circle'></span>The Data Added Successfully").find('span').css('color','green');
 				setTimeout(function(){ $('#add-work-modal').modal('hide'); }, 1200);
 				// Remove the tags and notes
 				$('#notes-form').html('');
 				$('#tag-section').empty().append('<div class="tags-added">'+projs_dict[projs[0].projectId]['pname']+'</div>');
 				$('#tag-section').data = [projs_dict[projs[0].projectId]['pname']];

 				// remove 17px padding from my-fixed-top navbar
 				//$('#my-fixed-top').css('padding-right', '0px');
 				// Refresh the main content
 				jsdata = {};
 				mainContentDiv.empty();
 				mainContentDiv.html('<div class="empty-box"></div><div class="initial-loading-container"><div class="initial-loading-gif"><img src="static/images/load-big.gif" alt="loading..." width="100%" height="100%"></div></div>');
 				make_ajax_call();
 			}

		},
		error: function(e){
			$('#add-work-footer-div').css('left', '10px').html("<span class='glyphicon glyphicon-remove-circle'></span>Error: Couldn't add the Data");						
		}
	});  

  });


  // For Event
  $('#add-event-submit').on('click', function(){
  	$(this).prop('disabled', true); // disable the button
  	$('#add-event-footer-div').css('left', '45%');
 	$('#add-event-footer-div').html('<img src="static/images/load-small.gif" alt="processing...">');
 	$('#add-event-cancel').prop('disabled', true);
 	$('#add-event-close').prop('disabled', true);

  	// first field will indicate whether it's a work or an event
  	var input1 = "event";
  	// date
  	var input3 = $('#date-form-button-event').text().slice(0,15);
  	// Achievement Star
  	var input6 = $('#form-event-star').data('value');
  	// Notes textarea-div
  	var input7 = $('#notes-form-event').removeTrailingDivs().html();
  	// Tags
  	var input8 = $('#event-tag-section').data('tags');
  	/*
	var input9 = document.createElement("input");
  	input9.setAttribute("type", "hidden");
  	input9.setAttribute("name", "venue");
  	input9.value = 'barber shop';
  	form.appendChild(input9);  
  	*/
  	var data = {'formkind':input1, 'date':input3, 'achievement':input6,
  				'notes':input7, 'tags':JSON.stringify(input8) };
	$.ajax({

		url: '/makeentry',
		type: 'POST',
		dataType: 'json',
		data: data,
		success: function(res){
			$('#add-event-submit').prop('disabled', false);
 			$('#add-event-cancel').prop('disabled', false);
 			$('#add-event-close').prop('disabled', false);
 			var fdiv = $('#add-event-footer-div').css('left', '10px');

 			if (res.response > 0) // already exists
 				fdiv.html("<span class='glyphicon glyphicon-remove-circle'></span>Something Wrong!");//won't occur
 						
 			else { // success
 				// display success message at the footer and close the modal
 				fdiv.html("<span class='glyphicon glyphicon-ok-circle'></span>The Event Added Successfully").find('span').css('color','green');
 				setTimeout(function(){ $('#add-event-modal').modal('hide'); }, 1200);
 				// Remove the tags from event-tag-section and clear notes
 				$('#notes-form-event').html('');
 				$('#event-tag-section').empty().append('<div class="tags-added">event</div>');
 				$('#event-tag-section').data = ['event'];

 				// Refresh the main content
 				jsdata = {};
 				//mainContentDiv.empty();
 				mainContentDiv.html('<div class="empty-box"></div><div class="initial-loading-container"><div class="initial-loading-gif"><img src="static/images/load-big.gif" alt="loading..." width="100%" height="100%"></div></div>');
 				make_ajax_call();

 			}

		},
		error: function(e){
			$('#add-event-footer-div').css('left', '10px').html("<span class='glyphicon glyphicon-remove-circle'></span>Error: Couldn't add the Event");						
					}
	});  

  }); 


	// edit or delete dropdown button click event handlers
	var set_edit_entry_event_handlers = function(){
	 
	  $('li.delete-entry').off('click').on('click', 'a', function(){
	    var ebox = $(this).closest('.entry-box');
	    var eid = ebox.attr('id');
	    // show a confirmation modal
	    $('#delete-entry-modal').modal({backdrop:'static', keyboard:false});
	    $('#my-fixed-top').css('padding-right','17px');
	    // listener for delete
	    $('#delete-entry-delete').off('click').on('click', function(){
	    	//console.log('confirmed to Delete');
	    	var pid = ebox.find('.entry-box-title').data('pid');
	    	// Ajax POST request to delete
	    	$.ajax({
				url: '/deleteentry',
				type: 'POST',
				data: {'eid': eid, 'pid':pid},
				dataType: 'json',
				success: function(res){
					if (res.response){
						// Refresh the main content
 						jsdata = {};
 						//mainContentDiv.empty();
 						mainContentDiv.html('<div class="empty-box"></div><div class="initial-loading-container"><div class="initial-loading-gif"><img src="static/images/load-big.gif" alt="loading..." width="100%" height="100%"></div></div>');
 						make_ajax_call();						
					}
				},
				error: function(e){
					console.log('Sorry! Deletion failed '+ e);
				}
			}); 
	    });
	    
	  });

	  // Edits common for Event and Work
	$('li.edit-entry').off('click').on('click', 'a', function(){
		
	  	$('#edit-entry-modal').modal({backdrop:'static', keyboard:false});
	  	$('#my-fixed-top').css('padding-right','17px');
	  	// retrieve the old notes
	  	var ebox = $(this).closest('.entry-box');
	  	
	  	// put the previous hours and minutes of work
	  	if (ebox.data('iswork')){
	  		$('#edit-entry-hours-form').removeClass('dont-display');
	  		$('#edit-entry-working-hours').html(ebox.data('h') + '<span class="caret"></span>');
	  		$('#edit-entry-working-minutes').html(ebox.data('m') + '<span class="caret"></span>');
	  	}
	  	else
	  		$('#edit-entry-hours-form').addClass('dont-display');
		
	  	$('#edit-entry-modal').data('eid', ebox.attr('id'));

	  	var note = '';
	  	if (ebox.find('.full-note').length > 0)
			note = ebox.find('.full-note').html();
		else
			note = ebox.find('.note-area').html();

		//console.log(ebox.find('.note-area').html());
	  	
	  	$('#notes-form-edit-entry').html(note);
	  	// set old tags
	  	var tags = ebox.find('.tags-added');
	  	// clean up the tags added previously
		var ts = $('#edit-entry-tag-section');
		ts.empty();
		if (tags.length>0){
	  		var tag = tags[0].textContent.trim();
	  		ts.data('tags', [tag]);
	  		var t = '<div class="tags-added"><span>'+tag+'</span></div>';
	  		ts.append(t);
	  	}	
	  	
	  	for(var i=1; i<tags.length; ++i){
	  		var tag = tags[i].textContent.trim();
	  		var t = '<div class="tags-added"><span>'+tag+'</span><a class="tag-remove">&times</a></div>';
		  	ts.append(t);
		  	var tag_data = ts.data('tags');
		  	tag_data.push(tag);
		  	ts.data('tags', tag_data);
		}
		 		

	  });

	}  

	// outside of set_edit_entry_event handlers
    // For Edit Entry Submit
  	$('#edit-entry-submit').on('click', function(){
  		$(this).prop('disabled', true); // disable the button
  		$('#edit-entry-footer-div').css('left', '45%');
 		$('#edit-entry-footer-div').html('<img src="static/images/load-small.gif" alt="processing...">');
 		$('#edit-entry-cancel').prop('disabled', true);
 		$('#edit-entry-close').prop('disabled', true);

  		// id of the entry being edited
  		var eid = $('#edit-entry-modal').data('eid');
  		// hours
  		var input4 = $('#edit-entry-working-hours').text();
		// minutes
  		var input5 = $('#edit-entry-working-minutes').text();
  		// Achievement Star
  		var input6 = $('#form-edit-entry-star').data('value');
  		// Notes textarea-div
  		var input7 = $('#notes-form-edit-entry').removeTrailingDivs().html();
  		// Tags
  		var input8 = $('#edit-entry-tag-section').data('tags');
  		
  		var data = {'eid':eid, 'hours':input4, 'minutes':input5, 'achievement':input6, 'notes':input7, 'tags':JSON.stringify(input8) };
		
		$.ajax({

		url: '/editentry',
		type: 'POST',
		dataType: 'json',
		data: data,
		success: function(res){
			$('#edit-entry-submit').prop('disabled', false);
 			$('#edit-entry-cancel').prop('disabled', false);
 			$('#edit-entry-close').prop('disabled', false);
 			var fdiv = $('#edit-entry-footer-div').css('left', '10px');

 				// display success message at the footer and close the modal
 				fdiv.html("<span class='glyphicon glyphicon-ok-circle'></span>Edited Successfully").find('span').css('color','green');
 				setTimeout(function(){ $('#edit-entry-modal').modal('hide'); }, 1200);
 				
 				// Refresh the main content
 				jsdata = {};
 				//mainContentDiv.empty();
 				mainContentDiv.html('<div class="empty-box"></div><div class="initial-loading-container"><div class="initial-loading-gif"><img src="static/images/load-big.gif" alt="loading..." width="100%" height="100%"></div></div>');
 				make_ajax_call();
 			
		},

		error: function(e){
			$('#edit-entry-footer-div').css('left', '10px').html("<span class='glyphicon glyphicon-remove-circle'></span>Server Error! Couldn't Edit");						
			$('#edit-entry-submit').prop('disabled', false);
 			$('#edit-entry-cancel').prop('disabled', false);
 			$('#edit-entry-close').prop('disabled', false);
					}
	});  

  }); 


  //------- End of Form submission in Data through javascript -------//

  // node is a javascript object not jquery
  var removeRecursively = function(node){
  	var childnodes = node.childNodes;
  	// if no childnode, then its a leaf node with text <div>some text</div>
  	if (childnodes.length === 0)
  		return;

  	for (var i=childnodes.length-1; i>=0; --i){
  		var childnode = childnodes[i];
  		if (childnode.textContent.trim().length === 0)
  			childnode.remove();
  		else {
  			removeRecursively(childnode);
  			return;
  		}
  	}
  }

  // JQuery plugin to remove trailing spaces and <div>s from html content
  // it should be called like $('#element').removeTrailingDivs
  $.fn.removeTrailingDivs = function(){

  	var node = this[0];
  	// if no text inside notes-area
  	if (node.textContent.trim().length === 0)
  		node.innerHTML = "";
  	else
  		removeRecursively(node);

  	return $(node);
  }	


  // Insert the icon-pad on top of textarea-div
  var ipad_template = $('#template-icon-pad').html();
  var ipad = Mustache.render(ipad_template, {});
  $('.textarea-div').before(ipad);	
  $('.textarea-div').before('<div class="clearfix"></div>');

  // Managing Bold, Italic etc. execCommand for textarea-div  //
	//---------------------------------------------------------//

	var heading_state = false;
	var hilite_state = false;
	$('.textarea-icon-group').on('click', function(event){
		var target = event.target,
			tagName = target.tagName.toLowerCase();
		
		if(target && tagName != 'button'){
			target = target.parentNode;
        	tagName = target.tagName.toLowerCase();
		}

		if(target && tagName === 'button'){
			var command = $(target).data('divbtn');
			var val = $(target).data('val');
			if (!val) val = '';

			var t = $(target).closest('.textarea-icon-group').siblings().filter('.textarea-div');
			//console.log(t);
			t.focus();

			if (command !== 'paint') {
			
				if (t.html().trim() === '')
            		t.html('<br>');
            	

				if (command === 'icon'){
					// insert a custom icon
					var val = $(target).html().trim();
					var node = document.createElement('div');
					node.setAttribute('class', 'inserted-icon');
					node.innerHTML = val;

					var sel, range;
    				if (window.getSelection) {
        				// IE9 and non-IE
        				sel = window.getSelection();
        				if (sel.getRangeAt && sel.rangeCount) {
        					var textNode = document.createElement('span');
        					textNode.innerHTML = " ";

        					range = sel.getRangeAt(0);
            				//range.deleteContents();
            				range.collapse(true);
            				range.insertNode(node);
            				range.setStartAfter(node);
            				range.insertNode(textNode);
            				range.setStartAfter(textNode);
            				range = range.cloneRange();
                			sel.removeAllRanges();
                			sel.addRange(range);

        				}
    				} 
    				else if (document.selection && document.selection.type != "Control") {
        				// IE < 9
        				document.selection.createRange().pasteHTML('<div class="inserted-icon">'+val+'</div>');
    				}

    				$('.inserted-icon').prop('contenteditable', false);

				}
				// commands like Bold Italic etc.
				else {
					if (command === 'formatBlock'){
						if (heading_state)
							val = 'div';

						heading_state = !heading_state;
					}
			
					if (command === 'hiliteColor'){
						if (hilite_state)
							val = '#fff';

						hilite_state = !hilite_state;
						//console.log(val + '  hilite '+hilite_state);
					}

					document.execCommand(command, false, val);
				}	

				t.focus();
			}

			else {
				// Insert Paint or Image
				var node = document.createElement('img');
				node.setAttribute('class', 'inserted-image');
				
				var sel, range;
    			if (window.getSelection) {
        			// IE9 and non-IE
        			sel = window.getSelection();
        			if (sel.getRangeAt && sel.rangeCount) {
        				range = sel.getRangeAt(0);
            			range.collapse(true);
        			}
    			} 

				$('#paint-modal').modal({backdrop:'static', keyboard:false});
				// whenever modal is opened add 17px padding-right to my-fixed-top to prevent it jumping
				$('#my-fixed-top').css('padding-right', '17px');

				$('#paint-submit').off().on('click', function(){
					var imgURL = canvas.toDataURL(); // default img/png

					if (sel.getRangeAt && sel.rangeCount) {
						node.src = imgURL;
						range.insertNode(node);
           				range.setStartAfter(node);
           				range = range.cloneRange();
               			sel.removeAllRanges();
               			sel.addRange(range);
               		}

               		$('#paint-modal').modal('hide');
				});

			}

		}	

	});
  // End of Managing Bold Italic etc. for textarea-div //



// --------------End of code for Data specifically -------------//  


//---------------------BEGIN TIMER----------------------------------//
//-----------------------------------------------------------------//

	var timer_state_icon = 'play'; //can be only play or pause
	var timer_active = false;
	var time_hour = 0;
	var time_minute = 0;
	var timer_id = 0; //id returned by setInterval
	var timer_interval = 1000*60; // 1 minute

	function formatTime(hour, minute){
	  if( isNaN(hour) || isNaN(minute) ){
		return('--:--');
	  }
	  else{
	    (minute<10) ? m = '0'+minute: m = ''+minute;
		(hour<10) ? h = '0'+hour : h = ''+hour;
		return (h+':'+m);	
	  }
	}

	function incrementTime(){
		time_minute += 1;
		if (time_minute >= 60){
			time_hour += 1;
			time_minute = 0;
		}
		$('#timer-time').text(formatTime(time_hour, time_minute));
		sessionStorage.setItem("hour", time_hour);
		sessionStorage.setItem("minute", time_minute);
	}

	// Session recovery of timer state on refresh
	if(sessionStorage.getItem("timer_icon") !== null){ // If timer is stopped, timer_state_icon will be removed	  
	  timer_state_icon = sessionStorage.getItem("timer_icon");
	  time_hour = parseInt(sessionStorage.getItem("hour"), 10);
	  time_minute = parseInt(sessionStorage.getItem("minute"), 10);
	  
	  if(Math.random() < 0.25){ // If user navigates away after 59 seconds whole 1 minute is lost
	  	time_minute += 1; // So assume 5 navigations per minute (if user starts browsing around)
	  	sessionStorage.setItem("minute", time_minute);
	  }

	  timer_active = true;
	  $('#stop-timer').addClass('stop-timer-active');
	  $('#timer-time').text(formatTime(time_hour, time_minute));	

	  if(timer_state_icon === 'pause'){  //timer was running when refresh
	    $('#play-pause-timer').children('div').removeClass('glyphicon-play').addClass('glyphicon-pause');
		timer_id = setInterval(incrementTime, timer_interval);	
	  }

	}

	$('#play-pause-timer').on('click', function(){ //currently not playing
		if(timer_state_icon === 'play'){
			timer_state_icon = 'pause';
			$(this).children('div').removeClass('glyphicon-play').addClass('glyphicon-pause');
			timer_active = true;
			$('#stop-timer').addClass('stop-timer-active');
			$('#timer-time').text(formatTime(time_hour, time_minute));
			timer_id = setInterval(incrementTime, timer_interval);
			sessionStorage.setItem("timer_icon", 'pause');
			sessionStorage.setItem("hour", time_hour);
			sessionStorage.setItem("minute", time_minute);
		}
		else if(timer_state_icon === 'pause'){ //currently playing
			timer_state_icon = 'play';
			$(this).children('div').removeClass('glyphicon-pause').addClass('glyphicon-play');	
			clearInterval(timer_id);

			sessionStorage.setItem("timer_icon", 'play');
		}
		else{ //timer_state === 'pause'
			alert("Error in play_pause button");
		}
	});

	$('#stop-timer').on('click', function(){
		if (timer_active){
			sessionStorage.removeItem("timer_icon");
			sessionStorage.removeItem("hour");
			sessionStorage.removeItem("minute");

			timer_active = false;
			$(this).removeClass('stop-timer-active');
			if(timer_state_icon === 'pause'){
				$('#play-pause-timer').children('div').removeClass('glyphicon-pause').addClass('glyphicon-play');
				timer_state_icon = 'play';
			}
			clearInterval(timer_id);
			$('#stop-timer-modal').modal('show');
			// whenever modal is opened add 17px padding-right to my-fixed-top to prevent it jumping
			$('#my-fixed-top').css('padding-right','17px');
			time_hour = 0;
			time_minute = 0;	
			$('#timer-time').text(formatTime('--', '--'));	
		}
	});
	/* Timer List of Projects Display
	$('#right-caret-arrow').on('click', function(){
		p_index += 1;
		p_index = (p_index >= projs.length)? 0 : p_index;
		$('#timer').find('.truncated').text(projs_dict[projs[p_index].projectId]['pname']);

	});
	$('#left-caret-arrow').on('click', function(){
		p_index -= 1;
		p_index = (p_index < 0)? projs.length-1 : p_index;
		$('#timer').find('.truncated').text(projs_dict[projs[p_index].projectId]['pname']);

	}); 
	*/
//------------------------------------------------------------//
//----------------END OF TIMER-------------------------------//
//$('#add-project').tooltip('show');
  //$('#json-div').tooltip('show');
  var welcome_new_users = function(){
  	var work_shown = false;
  	var add_proj = $('#add-project');
  	add_proj.data('toggle', "tooltip");
  	add_proj.attr('title', "Get Started By Adding A New Project Here!");
  	add_proj.data('placement', "right");
  	add_proj.tooltip('show');

  	// data-toggle="tooltip" title= data-placement="right" data-trigger="manual"

  	add_proj.hover(function(){
  		add_proj.tooltip('destroy');
  		
  		if (!work_shown){
  			var add_work = $('#add-work');
  			add_work.data('toggle', "tooltip");
  			add_work.attr('title', "Keep Making Notes Here Everyday!");
  			add_work.data('placement', "right");
  			add_work.tooltip('show');
  			add_work.hover(function(){
  				add_work.tooltip('destroy');
  			});
  			work_shown = true;
  		}	

  	});
  		
  }





  // Paint Application
	var sketch = document.querySelector('#sketch');
	var canvas = document.querySelector('#canvas');
	var tmp_canvas = document.createElement('canvas');
	$('#paint-modal').css('visibility', 'hidden').show();
	canvas.width = $(sketch).width();
	canvas.height = $(sketch).height();
	$('#paint-modal').css('visibility', 'visible').hide();
	tmp_canvas.width = canvas.width;
	tmp_canvas.height = canvas.height;

	var undo_canvas = [];
	var undo_canvas_len = 7;
	for (var i=0; i<undo_canvas_len; ++i) {
		var ucan = document.createElement('canvas');
		ucan.width = canvas.width;
		ucan.height = canvas.height;
		var uctx = ucan.getContext('2d');
		undo_canvas.push({'ucan':ucan, 'uctx':uctx, 'redoable':false});
	}

	var undo_canvas_top = 0; 

	var ctx = canvas.getContext('2d');
	var tmp_ctx = tmp_canvas.getContext('2d');
	tmp_canvas.id = 'tmp_canvas';
	sketch.appendChild(tmp_canvas);

	var mouse = {x: 0, y: 0};
	var start_mouse = {x:0, y:0};
	var eraser_width = 10;
	var fontSize = '14px';
	
	// Pencil Points
	var ppts = [];

	var chosen_size = 2; // by default
	
	tmp_ctx.lineWidth = 3;
	tmp_ctx.lineJoin = 'round';
	tmp_ctx.lineCap = 'round';
	tmp_ctx.strokeStyle = 'black';
	tmp_ctx.fillStyle = 'black';

	// paint functions
	var paint_pencil = function(e) {

		mouse.x = typeof e.offsetX !== 'undefined' ? e.offsetX : e.layerX;
		mouse.y = typeof e.offsetY !== 'undefined' ? e.offsetY : e.layerY;
		//console.log(mouse.x + " "+mouse.y);
		// Saving all the points in an array
		ppts.push({x: mouse.x, y: mouse.y});

		if (ppts.length < 3) {
			var b = ppts[0];
			tmp_ctx.beginPath();
			//ctx.moveTo(b.x, b.y);
			//ctx.lineTo(b.x+50, b.y+50);
			tmp_ctx.arc(b.x, b.y, tmp_ctx.lineWidth / 2, 0, Math.PI * 2, !0);
			tmp_ctx.fill();
			tmp_ctx.closePath();
			return;
		}
		
		// Tmp canvas is always cleared up before drawing.
		tmp_ctx.clearRect(0, 0, tmp_canvas.width, tmp_canvas.height);
		
		tmp_ctx.beginPath();
		tmp_ctx.moveTo(ppts[0].x, ppts[0].y);
		
		for (var i = 0; i < ppts.length; i++) 
			tmp_ctx.lineTo(ppts[i].x, ppts[i].y);
		
		tmp_ctx.stroke();
		
	};
	
	var paint_line = function(e) {

		mouse.x = typeof e.offsetX !== 'undefined' ? e.offsetX : e.layerX;
		mouse.y = typeof e.offsetY !== 'undefined' ? e.offsetY : e.layerY;	
		// Tmp canvas is always cleared up before drawing.
    	tmp_ctx.clearRect(0, 0, tmp_canvas.width, tmp_canvas.height);
 
    	tmp_ctx.beginPath();
    	tmp_ctx.moveTo(start_mouse.x, start_mouse.y);
    	tmp_ctx.lineTo(mouse.x, mouse.y);
    	tmp_ctx.stroke();
    	tmp_ctx.closePath();
	}

	var paint_square = function(e) {
		mouse.x = typeof e.offsetX !== 'undefined' ? e.offsetX : e.layerX;
		mouse.y = typeof e.offsetY !== 'undefined' ? e.offsetY : e.layerY;	
		// Tmp canvas is always cleared up before drawing.
    	tmp_ctx.clearRect(0, 0, tmp_canvas.width, tmp_canvas.height);
 		tmp_ctx.beginPath();
    	tmp_ctx.moveTo(start_mouse.x, start_mouse.y);

		var x = Math.min(mouse.x, start_mouse.x);
		var y = Math.min(mouse.y, start_mouse.y);
		var width = Math.abs(mouse.x - start_mouse.x);
		var height = Math.abs(mouse.y - start_mouse.y);
		tmp_ctx.strokeRect(x, y, width, height);
		tmp_ctx.closePath();
	}

	var paint_circle = function(e) {
		mouse.x = typeof e.offsetX !== 'undefined' ? e.offsetX : e.layerX;
		mouse.y = typeof e.offsetY !== 'undefined' ? e.offsetY : e.layerY;	
		// Tmp canvas is always cleared up before drawing.
    	tmp_ctx.clearRect(0, 0, tmp_canvas.width, tmp_canvas.height);
 
    	var x = (mouse.x + start_mouse.x) / 2;
    	var y = (mouse.y + start_mouse.y) / 2;
 
    	//var radius = Math.max(Math.abs(mouse.x - start_mouse.x), Math.abs(mouse.y - start_mouse.y)) / 2;
    	var a = mouse.x - start_mouse.x;
    	var b = mouse.y - start_mouse.y;
    	var r = Math.sqrt(a*a + b*b);
 
	    tmp_ctx.beginPath();
    	//tmp_ctx.arc(x, y, radius, 0, Math.PI*2, false);
    	tmp_ctx.arc(start_mouse.x, start_mouse.y, r, 0, 2*Math.PI);
    	// tmp_ctx.arc(x, y, 5, 0, Math.PI*2, false);
    	tmp_ctx.stroke();
    	tmp_ctx.closePath();
	}

	var paint_ellipse = function(e) {
		mouse.x = typeof e.offsetX !== 'undefined' ? e.offsetX : e.layerX;
		mouse.y = typeof e.offsetY !== 'undefined' ? e.offsetY : e.layerY;	
		// Tmp canvas is always cleared up before drawing.
    	tmp_ctx.clearRect(0, 0, tmp_canvas.width, tmp_canvas.height);
 
    	var x = start_mouse.x;
    	var y = start_mouse.y;
    	var w = (mouse.x - x);
    	var h = (mouse.y - y);
 		
  		tmp_ctx.save(); // save state
        tmp_ctx.beginPath();

        tmp_ctx.translate(x, y);
        tmp_ctx.scale(w/2, h/2);
        tmp_ctx.arc(1, 1, 1, 0, 2 * Math.PI, false);

        tmp_ctx.restore(); // restore to original state
        tmp_ctx.stroke();
        tmp_ctx.closePath();

	}

	var move_eraser = function(e){
		mouse.x = typeof e.offsetX !== 'undefined' ? e.offsetX : e.layerX;
		mouse.y = typeof e.offsetY !== 'undefined' ? e.offsetY : e.layerY;	
		// Tmp canvas is always cleared up before drawing.
		tmp_ctx.clearRect(0, 0, tmp_canvas.width, tmp_canvas.height);
		var tmp_lw = tmp_ctx.lineWidth;
		var tmp_ss = tmp_ctx.strokeStyle;
		tmp_ctx.lineWidth = 1;
		tmp_ctx.strokeStyle = 'black';
		tmp_ctx.beginPath();
    	tmp_ctx.strokeRect(mouse.x, mouse.y, eraser_width, eraser_width);
    	tmp_ctx.stroke();
    	tmp_ctx.closePath();
    	// restore linewidth
    	tmp_ctx.lineWidth = tmp_lw;
    	tmp_ctx.strokeStyle = tmp_ss;
	}

	var paint_text = function(e) {
		// Tmp canvas is always cleared up before drawing.
    	tmp_ctx.clearRect(0, 0, tmp_canvas.width, tmp_canvas.height);
     	mouse.x = typeof e.offsetX !== 'undefined' ? e.offsetX : e.layerX;
		mouse.y = typeof e.offsetY !== 'undefined' ? e.offsetY : e.layerY;	

    	var x = Math.min(mouse.x, start_mouse.x);
    	var y = Math.min(mouse.y, start_mouse.y);
    	var width = Math.abs(mouse.x - start_mouse.x);
    	var height = Math.abs(mouse.y - start_mouse.y);
     
    	textarea.style.left = x + 'px';
    	textarea.style.top = y + 'px';
    	textarea.style.width = width + 'px';
    	textarea.style.height = height + 'px';
     
    	textarea.style.display = 'block';
	}

	var paint_eraser = function(e) {
		mouse.x = typeof e.offsetX !== 'undefined' ? e.offsetX : e.layerX;
		mouse.y = typeof e.offsetY !== 'undefined' ? e.offsetY : e.layerY;	
		// erase from the main ctx
    	ctx.clearRect(mouse.x, mouse.y, eraser_width, eraser_width);
	}

	
	// Choose tool
	tool = 'pencil';
	tools_func = {'pencil':paint_pencil, 'line':paint_line, 'square':paint_square, 
					'circle':paint_circle, 'ellipse':paint_ellipse, 'eraser':paint_eraser,
					'text':paint_text};

	$('#paint-panel').on('click', function(event){
		// remove the mouse down eventlistener if any
		tmp_canvas.removeEventListener('mousemove', tools_func[tool], false);

		var target = event.target,
			tagName = target.tagName.toLowerCase();
		
		if(target && tagName != 'button'){
			target = target.parentNode;
        	tagName = target.tagName.toLowerCase();
		}

		if(target && tagName === 'button'){
			tool = $(target).data('divbtn');

			if (tool === 'eraser') {
				tmp_canvas.addEventListener('mousemove', move_eraser, false);
				$(tmp_canvas).css('cursor', 'none');
			}
			else {
				tmp_canvas.removeEventListener('mousemove', move_eraser, false);	
				$(tmp_canvas).css('cursor', 'crosshair');
				tmp_ctx.clearRect(0, 0, tmp_canvas.width, tmp_canvas.height);
			}
		}
	});
	
	// Change color
	$('#color-panel').on('click', function(event){
		// remove the mouse down eventlistener if any
		tmp_canvas.removeEventListener('mousemove', tools_func[tool], false);

		var target = event.target,
			tagName = target.tagName.toLowerCase();
		
		if(target && tagName != 'button'){
			target = target.parentNode;
        	tagName = target.tagName.toLowerCase();
		}

		if(target && tagName === 'button'){
			tmp_ctx.strokeStyle =  $(target).data('color');
			tmp_ctx.fillStyle =  $(target).data('color');
		}
	});

	

	// Mouse-Down 
	tmp_canvas.addEventListener('mousedown', function(e) {
		
		mouse.x = typeof e.offsetX !== 'undefined' ? e.offsetX : e.layerX;
		mouse.y = typeof e.offsetY !== 'undefined' ? e.offsetY : e.layerY;
		start_mouse.x = mouse.x;
    	start_mouse.y = mouse.y;	
    	tmp_ctx.clearRect(0, 0, tmp_canvas.width, tmp_canvas.height);

		if (tool === 'pencil') {
			tmp_canvas.addEventListener('mousemove', paint_pencil, false);
			ppts.push({x: mouse.x, y: mouse.y});
			paint_pencil(e);
		}
		
		if (tool === 'line') {
			tmp_canvas.addEventListener('mousemove', paint_line, false);
    	}

		if (tool === 'square') {
			tmp_canvas.addEventListener('mousemove', paint_square, false);	
		}
		
		if (tool === 'circle') {
			tmp_canvas.addEventListener('mousemove', paint_circle, false);
    		// Mark the center
    		
    		tmp_ctx.beginPath();
			//ctx.moveTo(b.x, b.y);
			//ctx.lineTo(b.x+50, b.y+50);
			tmp_ctx.arc(start_mouse.x, start_mouse.y, tmp_ctx.lineWidth / 2, 0, Math.PI * 2, !0);
			tmp_ctx.fill();
			tmp_ctx.closePath();
			// copy to real canvas
			ctx.drawImage(tmp_canvas, 0, 0);	
		}

		if (tool === 'ellipse') {
			tmp_canvas.addEventListener('mousemove', paint_ellipse, false);
    	}

    	if (tool === 'text') {
    		tmp_canvas.addEventListener('mousemove', paint_text, false);
    		textarea.style.display = 'none'; // important to hide when clicked outside
    	}

    	if (tool === 'eraser') {
    		tmp_canvas.addEventListener('mousemove', paint_eraser, false);
    		// erase from the main ctx
    		ctx.clearRect(mouse.x, mouse.y, eraser_width, eraser_width);		
    	}

    	if (tool === 'fill') {
    		var replacement_color = hex_to_color(tmp_ctx.strokeStyle);
    		//console.log(tmp_ctx.strokeStyle);	
    		var red_component = {'red':255, 'lime':0, 'blue':0, 'orange':255, 'yellow':255, 'magenta':255, 
						'cyan':0, 'purple':128, 'brown':165, 'gray':128, 'lavender':230, 
						'white':255, 'black':0};
			var green_component = {'red':0, 'lime':255, 'blue':0, 'orange':165, 'yellow':255, 'magenta':0, 
						'cyan':255, 'purple':0, 'brown':42, 'gray':128, 'lavender':230, 
						'white':255, 'black':0};
			var blue_component = {'red':0, 'lime':0, 'blue':255, 'orange':0, 'yellow':0, 'magenta':255, 
						'cyan':255, 'purple':128, 'brown':42, 'gray':128, 'lavender':250, 
						'white':255, 'black':0};												

    		var replace_r = red_component[replacement_color];
    		var replace_g = green_component[replacement_color];
    		var replace_b = blue_component[replacement_color];

    		var imgd = ctx.getImageData(0, 0, canvas.width, canvas.height);
			var pix = imgd.data;
			// pix is row-wise straightened array
			var pos = 4 * (canvas.width * mouse.y + mouse.x);
			var target_color = map_to_color(pix[pos],pix[pos+1],pix[pos+2],pix[pos+3]);
			
			// start the flood fill algorithm
			if (replacement_color !== target_color) {
				var Q = [pos];
				while (Q.length > 0) {
					pos = Q.shift();
					if (map_to_color(pix[pos],pix[pos+1],pix[pos+2],pix[pos+3]) !== target_color)
						continue; // color is already changed

					var left = find_left_most_similar_pixel(pix, pos, target_color);
					var right = find_right_most_similar_pixel(pix, pos, target_color);
					// replace color
					//console.log('right: '+ (right/4)%canvas.width + ' '+ Math.floor(right/(4*canvas.width))  );
					//console.log(j+'. '+(right-left));
					for (var i=left; i<=right; i=i+4) {
						pix[i] = replace_r;
						pix[i+1] = replace_g;
						pix[i+2] = replace_b;
						pix[i+3] = 255; // not transparent

						var top = i - 4*canvas.width;
						var down = i + 4*canvas.width;

						if (top >= 0 && map_to_color(pix[top], pix[top+1], pix[top+2], pix[top+3]) === target_color) 
							Q.push(top); 

						if (down < pix.length && map_to_color(pix[down], pix[down+1],pix[down+2],pix[down+3]) === target_color)
							Q.push(down);
					}
					
				}	
				
				// Draw the ImageData at the given (x,y) coordinates.
				ctx.putImageData(imgd, 0, 0);	
					
			}

			
    	}
		
	}, false);
		
	// for filling	
	var find_left_most_similar_pixel = function(pix, pos, target_color) {
		var y = Math.floor(pos/(4*canvas.width));
		var left = pos;
		var end = y * canvas.width * 4;
		while (end < left) {
			if (map_to_color(pix[left-4],pix[left-3],pix[left-2],pix[left-1]) === target_color)
				left = left - 4;
			else
				break;
		}
		return left;
	}

	var find_right_most_similar_pixel = function(pix, pos, target_color) {
		var y = Math.floor(pos/(4*canvas.width));
		var right = pos;
		var end = (y+1) * canvas.width * 4 - 4;
		while (end > right) {
			if (map_to_color(pix[right+4],pix[right+5],pix[right+6],pix[right+7]) === target_color)
				right = right + 4;
			else
				break;
		}
		return right;
	}

	var hex_to_color = function(hex) {
	    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    	var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    	hex = hex.replace(shorthandRegex, function(m, r, g, b) {
        	return r + r + g + g + b + b;
    		});

    	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    	var r = parseInt(result[1], 16),
            g = parseInt(result[2], 16),
            b = parseInt(result[3], 16);
    	
		return map_to_color(r, g, b, 255);
	}

	var map_to_color = function(r,g,b,a) {
		if (a === 0)
			return 'white';
		else {
			if (r===255 && g===0 && b===0)
				return 'red';
			if (r===0 && g===255 && b===0)
				return 'lime';
			if (r===0 && g===0 && b===255)
				return 'blue';
			if (r===255 && g===255 && b===0)
				return 'yellow';
			if (r===255 && g===0 && b===255)
				return 'magenta';
			if (r===0 && g===255 && b===255)
				return 'cyan';
			if (r===255 && g===165 && b===0)
				return 'orange';
			if (r===128 && g===0 && b===128)
				return 'purple';
			if (r===128 && g===128 && b===128)
				return 'gray';
			if (r===0 && g===0 && b===0)
				return 'black';
			if (r===230 && g===230 && b===250)
				return 'lavender';
			if (r===165 && g===42 && b===42)
				return 'brown';
		}

		return 'white';
	}

	// text-tool
	var textarea = document.createElement('textarea');
	textarea.id = 'text_tool';
	sketch.appendChild(textarea);


	textarea.addEventListener('mouseup', function(e) {
		tmp_canvas.removeEventListener('mousemove', paint_text, false);
	}, false);

	// set the color
	textarea.addEventListener('mousedown', function(e){
		textarea.style.color = tmp_ctx.strokeStyle;
		textarea.style['font-size'] = fontSize;
	}, false);
	

	textarea.addEventListener('blur', function(e) {
		var lines = textarea.value.split('\n');
			var ta_comp_style = getComputedStyle(textarea);
    		var fs = ta_comp_style.getPropertyValue('font-size');
    		
    		var ff = ta_comp_style.getPropertyValue('font-family');
    
    		tmp_ctx.font = fs + ' ' + ff;
    		tmp_ctx.textBaseline = 'hanging';
     
    		for (var n = 0; n < lines.length; n++) {
        		var line = lines[n];
         
        		tmp_ctx.fillText(
            		line,
            		parseInt(textarea.style.left),
            		parseInt(textarea.style.top) + n*parseInt(fs)
        		);    		
    		}
     
    		// Writing down to real canvas now
    		ctx.drawImage(tmp_canvas, 0, 0);
    		textarea.style.display = 'none';
    		textarea.value = '';
    		// Clearing tmp canvas
			tmp_ctx.clearRect(0, 0, tmp_canvas.width, tmp_canvas.height);

			// keep the image in the undo_canvas
			undo_canvas_top = next_undo_canvas(undo_canvas_top);
			var uctx = undo_canvas[undo_canvas_top]['uctx'];
			uctx.clearRect(0, 0, canvas.width, canvas.height);
			uctx.drawImage(canvas, 0, 0);
			undo_canvas[undo_canvas_top]['redoable'] = false;
	});

	tmp_canvas.addEventListener('mouseup', function() {
		tmp_canvas.removeEventListener('mousemove', tools_func[tool], false);
		
		// Writing down to real canvas now
		// text-tool is managed when textarea.blur() event
		if (tool !=='text') {
			if (tool !=='eraser')
				ctx.drawImage(tmp_canvas, 0, 0);
			// keep the image in the undo_canvas
			undo_canvas_top = next_undo_canvas(undo_canvas_top);
			var uctx = undo_canvas[undo_canvas_top]['uctx'];
			uctx.clearRect(0, 0, canvas.width, canvas.height);
			uctx.drawImage(canvas, 0, 0);
			undo_canvas[undo_canvas_top]['redoable'] = false;
		}


		// Clearing tmp canvas
		tmp_ctx.clearRect(0, 0, tmp_canvas.width, tmp_canvas.height);
		
		// Emptying up Pencil Points
		ppts = [];
	}, false);
	
	var next_undo_canvas = function(top) {
		if (top === undo_canvas_len-1)
			return 0;
		else
			return top+1;
	}

	var prev_undo_canvas = function(top) {
		if (top === 0) 
			return undo_canvas_len-1;
		else
			return  top-1;
	}

	// clear paint area
	$('#paint-clear').click(function(){
		ctx.clearRect(0, 0, tmp_canvas.width, tmp_canvas.height);
		// keep the image in the undo_canvas
		undo_canvas_top = next_undo_canvas(undo_canvas_top);
		var uctx = undo_canvas[undo_canvas_top]['uctx'];
		uctx.clearRect(0, 0, canvas.width, canvas.height);
		uctx.drawImage(canvas, 0, 0);
		undo_canvas[undo_canvas_top]['redoable'] = false;
	});


	// Change Size
	$('#choose-size .radio-group').on('click', function(){
		var s = $('input[name=size]:checked', '#choose-size').val();
		if (s==='1') {
			tmp_ctx.lineWidth = 1;
			eraser_width = 5;
			fontSize = '10px';
		}
		if (s==='2') {
			tmp_ctx.lineWidth = 3;
			eraser_width = 10;
			fontSize = '14px';
		}
		if (s==='3') {
			tmp_ctx.lineWidth = 6;
			eraser_width = 15;
			fontSize = '18px';
		}
		if (s==='4') {
			tmp_ctx.lineWidth = 10;
			eraser_width = 20;
			fontSize = '22px';
		}
	});

	// undo-redo tools
	$('#undo-tool').on('click', function(){
		var prev = prev_undo_canvas(undo_canvas_top);
		if (!undo_canvas[prev].redoable) {
			console.log(undo_canvas_top+' prev='+prev);
			var ucan = undo_canvas[prev]['ucan'];
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.drawImage(ucan, 0, 0);
			undo_canvas[undo_canvas_top].redoable = true;
			undo_canvas_top = prev;
		}
	});
	
	$('#redo-tool').on('click', function(){
		var next = next_undo_canvas(undo_canvas_top);
		if (undo_canvas[next].redoable) {
			console.log(undo_canvas_top);
			var ucan = undo_canvas[next]['ucan'];
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.drawImage(ucan, 0, 0);
			undo_canvas[next].redoable = false;
			undo_canvas_top = next;
		}
	});


});
     
