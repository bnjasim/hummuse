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

  	// function to combine a week long data into a weekbox similar in structure to a daybox
  	// called from reformat_data_to_weekly() function
  	// a weekbox [{date:date, project:hummuse, notes:notes...}, {date:date, project:datascience,},{}..]
/*  	var mashup_week_projects = function(temp_week){
  		// temp_week is an array of dayboxes
  		var weekentries = []; // to return
  		var hashproj = {};

  		// 1 pass to group entries by projects
  		for (var i=0; i<temp_week.length; ++i){
  			var d = temp_week[i]; // just one day in the week
  			var dentries = d.entries; // an array with uique projects and events
  			for (var j=0; j<dentries.length; ++j){
  				var e = dentries[j];
  				if (hashproj[e.proj])
  					hashproj[e.proj] = hashproj[e.proj].concat(e);
  				else if(e.proj)
  					hashproj[e.proj] = [e];
  				else if(hashproj['events'])
  					hashproj['events'] = hashproj['events'].concat(e);
  				else
  					hashproj['events'] = [e];
  			}
  		}
  		// 2nd pass over hashproj to create summary over projects
		$.each(hashproj, function(key_proj, value_entries){
			var work_or_event_mashed_entry = {},
				totalh = 0,
  				combinedNotes = '',
  				shortnotes = '',
  				combinedTags = [];
  				combinedTagsLower = []; // just to compare

			if(key_proj !== 'events'){

  				var entry = {};

  				for (var i=0; i<value_entries.length; ++i){

  					entry = value_entries[i];
  					totalh += entry['hrs'];
  					
					// combine tags & avoid repitions
  					var tags = entry['tags'];
  					
  					// if tags = [""] then don't concat
  					for(var j=0; j<tags.length; ++j) {
  						var t = tags[j],
  							t_lower = t.replace(/ /g, '').toLowerCase();
  						// t_lower not present	
  						if (t != "" && combinedTagsLower.indexOf(t_lower) === -1){
  							combinedTags.push(t);	
  							combinedTagsLower.push(t_lower);
  						}
  					}

  					var notes = entry['notes'];
  					shortnotes += findSummaryFromNotes(notes) + '<br/>';
  					combinedNotes += '<br/>' + entry['date']+':' + notes;
  				
  				}

  				shortnotes = shortnotes.slice(0,-5); // get ridoff last br
  				shortnotes += '..<a class="show-more-notes">(more)</a>';

  				work_or_event_mashed_entry['isWork'] = true;
  				work_or_event_mashed_entry['notes'] = combinedNotes;
  				work_or_event_mashed_entry['isnotebig'] = true;
  				work_or_event_mashed_entry['shortnotes'] = shortnotes;
  				work_or_event_mashed_entry['tags'] = combinedTags;
  				work_or_event_mashed_entry['proj'] = key_proj;
  				work_or_event_mashed_entry['hrs'] = totalh;
  				work_or_event_mashed_entry['isproductive'] = entry['isproductive'];
  			}

  			else { // an event

  				for (var i=0; i<value_entries.length; ++i){

  					var entry = value_entries[i];

  					// combine tags & avoid repitions
  					var tags = entry['tags'];
  					
  					// if tags = [""] then don't concat
  					for(var j=0; j<tags.length; ++j) {
  						var t = tags[j],
  							t_lower = t.replace(/ /g, '').toLowerCase();
  						// t_lower not present	
  						if (t != "" && combinedTagsLower.indexOf(t_lower) === -1){
  							combinedTags.push(t);	
  							combinedTagsLower.push(t_lower);
  						}
  					}

					var notes = entry['notes'];
  					shortnotes += findSummaryFromNotes(notes) + '<br/>';
  					combinedNotes += entry['date']+':' + notes + '<br/>';
  				}

  				shortnotes += '..<a style="position:relative; left:80%;" class="show-more-notes">(more)</a>';

  				work_or_event_mashed_entry['isWork'] = false;
  				work_or_event_mashed_entry['notes'] = combinedNotes;
  				work_or_event_mashed_entry['isnotebig'] = true;
  				work_or_event_mashed_entry['shortnotes'] = shortnotes;
  				work_or_event_mashed_entry['tags'] = combinedTags;

  			}

  			weekentries.push(work_or_event_mashed_entry);

  		});
		
		return weekentries;

  	}

  	// we want a week to start from Mon
	Date.prototype.getMyDay  = function(){var a = this.getDay() - 1; if (a<0){a=6}; return a}

  	var reforamt_data_to_weekly = function(data){
  		// weekly_data should be an array of dayboxes
  		var weekly_data = [];
  		// a week is from Mon to Sun
  		
  		var temp_week = [data[0]],
  			temp_date = new Date(data[0]['date']),
  			week_start_date = new Date(data[0]['date']),
  			week_end_date = new Date(data[0]['date']);

  		week_start_date.setDate(week_start_date.getDate() - week_start_date.getMyDay());
  	    week_end_date.setDate(week_end_date.getDate() + 6 - week_end_date.getMyDay());
  	    
  	    var weekbox = {};
  	    weekbox['date'] = week_start_date.toDateString();
  	    weekbox['enddate'] = week_end_date.toDateString();
  	    
  	    weekly_data.push(weekbox);

  	    for (var i=1; i<data.length; ++i){
  	    	temp_date = new Date(data[i]['date']);

  	    	if (temp_date >= week_start_date)
  	    		// in the same week - prepend - unshift
  	    		temp_week.unshift(data[i]);

  	    	else {
  	    		// finish the previous weekbox
  	    		weekbox['entries'] = mashup_week_projects(temp_week);

  	    		temp_week = [data[i]];
  	    		weekbox = {};

  	    		week_start_date = new Date(data[i]['date']),
  				week_end_date = new Date(data[i]['date']);
  				week_start_date.setDate(week_start_date.getDate() - week_start_date.getMyDay());
  	    		week_end_date.setDate(week_end_date.getDate() + 6 - week_end_date.getMyDay());

  	    		weekbox['date'] = week_start_date.toDateString();
  	    		weekbox['enddate'] = week_end_date.toDateString();
  	    		
  	    		weekly_data.push(weekbox);

  	    	}
  	    // finally add last one
		weekbox['entries'] = mashup_week_projects(temp_week);
  	    		
  	    }
  		
  		return weekly_data;
  	}

*/
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

			entry['hrs_string'] = hour_string;
			entry['ishz'] = (h === 0 && m === 0); // only if both are zero

			var notes = entry['notes'],
				note_limit = 300, //  #characters not including html tags
				isnotebig = false;


			// if the entry is not altered already	
			if (!entry['shortnotes']) {
				var input1 = document.createElement("div");
				//console.log(input1);
				input1.innerHTML = notes;
				notes_text = input1.textContent;
				isnotebig = notes_text.length > note_limit;
				if (isnotebig) 
					entry['shortnotes'] = formShortNotes(notes_text, note_limit);
			}	
					
			if (!entry['isnbig']) // if not previously set
				entry['isnbig'] = isnotebig;

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
  				if(entries.length>1 && (totalh>0 || totalm>0))
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

  			// collapse full-notes if clicked on All
  			$('.short-note').css('display', 'inline');
  			$('.full-note').css('display', 'none');

			$('a.show-more-notes').on('click', function(){
				$(this).closest('.short-note').css("display", "none");
				$(this).closest('.short-note').siblings('.full-note').css("display", "inline");
			});

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

 				/*else if (summary_state === 'weekly'){
 					// if in the same week, more complex
 					if (in_the_same_week(date1, date2)){
 						if (weeks_loaded > 0)
 							offset = weeks_loaded - 1;
 						// remove the last weekly-box
 						$('.daily-box').last().remove();
 					}
 					else {
 						offset = weeks_loaded;
 					}
 				} */

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

				// in the timer header as well
				$('#timer').find('.truncated').text(projs_dict[projs[0].projectId]['pname']);

				// in the edit-projects modal as well
				//set_edit_projects_modal();

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



	//--------------Projects--------------------//
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



   //--------END of EDIT Projects ---------------//

 	//--------END of Projects---------------------//


   //--------- Data Entry ----------------------------//

   $('#add-work').on('click', function(){
 		$('#add-work-footer-div').empty(); // remove warnings from modal
		$('#add-work-modal').modal({backdrop:'static', keyboard:false});
		// whenever modal is opened add 17px padding-right to my-fixed-top to prevent it jumping
		$('#my-fixed-top').css('padding-right', '17px');
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
		// whenever modal is opened add 17px padding-right to my-fixed-top to prevent it jumping
		$('#my-fixed-top').css('padding-right', '17px');
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

 	


// --------Home Page -----------------------//

	
	/*$('#summary-panel').find('li').on('click', 'a', function(){
	  $('#summary-panel').find('.left-panel-link-highlight').removeClass('left-panel-link-highlight');//remove hightlight first
	  $('#projects-panel').find('.left-panel-link-highlight').removeClass('left-panel-link-highlight');//remove hightlight first
	  $(this).addClass('left-panel-link-highlight');	
	});

	$('#summary-weekly').on('click', function(){
		if (summary_state !== 'weekly') {
			summary_state = 'weekly';
			if (jsdata['data']) { // don't do anything if first data has not arrived
				mainContentDiv.empty();
				mainContentDiv.append('<div class="empty-box"></div>');
				render_content(0);
			}
		}
	});
	$('#summary-daily').on('click', function(){
		if (summary_state !== 'daily'){
			summary_state = 'daily';
			if (jsdata['data']) {// don't do anything before first data has arrived
				mainContentDiv.empty();
				mainContentDiv.append('<div class="empty-box"></div>');
				render_content(0);
			}
		}

	}); */

	

	/* $('#star-panel').on('click', function(){	
		$(this).toggleClass('left-panel-link-highlight');
		$(this).find('div').toggleClass('glyphicon-star-empty');	
		$(this).find('div').toggleClass('glyphicon-star');
		
	}); */

	//var project_array = ['Hummuse', 'One Wolf and two goats befriend three cows','NLP','Data Science'];
	

	//----------- Code for data.html ---------------------//
	//---------------------------------------------------//


  	//-------- Fill the current date and previous 7 dates in data and event
  	//as soon as page is loaded	---------------//
  	var date = new Date(); // today
  	var data_form_dropdown_menu = $('#date-form-button').siblings('.select-dropdown-menu')[0],
  		event_form_dropdown_menu = $('#date-form-button-event').siblings('.select-dropdown-menu')[0];
  	// Execute the code only for data.html not for project.html etc.
  	if(data_form_dropdown_menu) {
    	$('#date-form-button').html(date.toDateString() + ' - Today'+'<span class="caret">');
    	$('#date-form-button-event').html(date.toDateString() + ' - Today'+'<span class="caret">');

    	for(var j=0; j<38; ++j){
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

		// simulate button click by pressing Enter
		$('#tag-input-text').keyup(function(event){
			if(event.keyCode === 13)
				$('#add-tag-button').click();
		});

		$('#event-tag-input-text').keyup(function(event){
			if(event.keyCode === 13)
				$('#event-add-tag-button').click();
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
		  	var t = '<div class="tags-added"><span>'+tag+'</span><a class="tag-remove">&times</a></div>',
		  	    ts = $('#tag-section');
		 
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
		  		tag_data = tag_data.concat(tag);
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
		
// Managing Bold, Italic etc. execCommand for textarea-div  //
//---------------------------------------------------------//
	$('.textarea-icon-group').on('click', function(event){
		var target = event.target,
			tagName = target.tagName.toLowerCase();
		
		if(target && tagName != 'button'){
			target = target.parentNode;
        	tagName = target.tagName.toLowerCase();
		}

		if(target && tagName === 'button'){
			var command = $(target).data('divbtn');
			var t = $(target).parent().parent().siblings().filter('.textarea-div');
			console.log(t);
			t.focus();
			document.execCommand(command);
			t.focus();
		}

	})	
  // End of Managing Bold Italic etc. for textarea-div //


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
  	var input7 = $('#notes-form').html();
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
 				fdiv.html("<span class='glyphicon glyphicon-remove-circle'></span>Something Wrong!");//won't occur
 						
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
  	var input7 = $('#notes-form-event').html();
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
  //------- End of Form submission in Data through javascript -------//




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
	// Timer List of Projects Display
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
//------------------------------------------------------------//
//----------------END OF TIMER-------------------------------//


});
     
