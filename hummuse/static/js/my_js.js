$(document).ready(function(){
	//window.onbeforeunload = function(){
	//	if(timer_active && disallow_move_away){
  	//	  return "Timer running!";
  	//	}
  	//	else return null;
	//}

	/* Deprecated Code for rta
	path = window.location.href; // current page
	loc = path.substring(path.lastIndexOf('/')+1);
	if(loc.substring(0, loc.indexOf('.')) == "data"){
		$.rta(); // rich text area
	}
	*/

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
	  
	  if(Math.random() < 0.2){ // If user navigates away after 59 seconds whole 1 minute is lost
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
			time_hour = 0;
			time_minute = 0;	
			$('#timer-time').text(formatTime('--', '--'));	
		}
	});
//------------------------------------------------------------//
//----------------END OF TIMER-------------------------------//


	$('#leftpanel-add-event').on('click', function(){		
	  $('#new-event-modal').modal('show');
	  
	});

	$('#summary-panel').find('li').on('click', 'a', function(){
	  $('#summary-panel').find('.left-panel-link-highlight').removeClass('left-panel-link-highlight');//remove hightlight first
	  $(this).addClass('left-panel-link-highlight');	
	});

	$('#project-panel').find('li').on('click', 'a', function(){
		$('#project-panel').find('.left-panel-link-highlight').removeClass('left-panel-link-highlight');//remove hightlight first
		$(this).addClass('left-panel-link-highlight');	
	});

	$('#star-panel').on('click', function(){	
		$(this).toggleClass('left-panel-link-highlight');
		$(this).find('div').toggleClass('glyphicon-star-empty');	
		$(this).find('div').toggleClass('glyphicon-star');
		
	});

	var project_array = ['Hummuse', 'One Wolf and two goats befriend three cows','NLP','Data Science'];
	var p_index = 0;
	$('#right-caret-arrow').on('click', function(){
		p_index += 1;
		p_index = (p_index >= project_array.length)? 0 : p_index;
		$(this).closest('.timer-header').find('.truncated').text(project_array[p_index]);

	});
	$('#left-caret-arrow').on('click', function(){
		p_index -= 1;
		p_index = (p_index < 0)? project_array.length-1 : p_index;
		$(this).closest('.timer-header').find('.truncated').text(project_array[p_index]);

	});

	//----------- Code for data.html ---------------------//
	//---------------------------------------------------//

  //-------- Fill the current date and previous 7 dates in data and event
  //as soon as page is loaded	---------------//
  var date = new Date(); // today
  var data_form_dropdown_menu = $('#date-form-button').siblings('.select-dropdown-menu')[0],
  event_form_dropdown_menu = $('#date-form-button-event').siblings('.select-dropdown-menu')[0];
  // Execute the code only for data.html not for project.html etc.
  if(data_form_dropdown_menu) {
    $('#date-form-button')[0].innerText = date.toDateString() + ' - Today';
    $('#date-form-button-event')[0].innerText = date.toDateString() + ' - Today';

    for(var j=0; j<8; ++j){
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
  // callback - should execute only after dates are set - not really important
  // but this should come only after setting dates in the form in data and event
  var set_listener = function(){

    $('.select-dropdown-menu a').on('click', function(){   //hack for mobiles included
    	  $(this).parent().parent().parent().find('button')
    	  	.html($(this).html() + '<span class="caret"></span>');    
		});

    $('.project-dropdown-menu a').on('click', function(){   //we need to copy data-pid aswell
    	  var b = $(this).parent().parent().parent().find('button');
    	  b.html( $(this).html() + '<span class="caret"></span>' );    
    	  b.data( 'pid', $(this).data('pid') );
		});

  } // ---End of set_listener -------//
  set_listener();

		
		// for changing star colour in data entry
		$('#form-data-star').on('click', function(){
		  $(this).find('div').toggleClass('glyphicon-star-empty');
		  $(this).find('div').toggleClass('glyphicon-star');
		  var star = $('#form-data-star'); // jquery object
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

		// function to find whether a string is present in a list
		// case insensitive findtag(["binu", "jasim"], BiNu) => true
		var findtag = function(a, query){
			var q = query.toLowerCase();
			for(var i=0; i<a.length; ++i){
				if(a[i].toLowerCase() === q) 
					return true;
			}
			return false;
		}
		// Add tag
		$('#add-tag-button').on('click', function(){
		  var tag = $('#tag-input-text').val();
		  $('#tag-input-text').val("");

		  if(tag.trim().length > 0){
		  	var t = '<div class="tags-added">'+tag+'</div>',
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
		// Add tag for event
		$('#event-add-tag-button').on('click', function(){
		  var tag = $('#event-tag-input-text').val();
		  $('#event-tag-input-text').val("");

		  if(tag.trim().length > 0){
		  	var t = '<div class="tags-added">'+tag+'</div>',
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
  $('#form-work-submit').on('click', function(){
  	var form = $('#form-work')[0];
  	// Create hidden input fields corresponding to each button etc. in the form
  	// first field will indicate whether it's a work or an event
  	var input1 = document.createElement("input");
  	input1.setAttribute("type", "hidden");
  	input1.setAttribute("name", "formkind");
  	input1.value = "work";
  	form.appendChild(input1);
  	// input2 is project name
  	var input2 = document.createElement("input");
  	input2.setAttribute("type", "hidden");
  	input2.setAttribute("name", "project");
  	//input2.value = $('#work-form-button')[0].innerText;
  	input2.value = $('#work-form-button').data('pid');
  	form.appendChild(input2);
  	// date
  	var input3 = document.createElement("input");
  	input3.setAttribute("type", "hidden");
  	input3.setAttribute("name", "date");
  	// first one is "Wed Jun 2015 - Today"
  	// strip off the Today with slice
  	input3.value = $('#date-form-button')[0].innerText.slice(0,15);
  	form.appendChild(input3);
  	// hours
  	var input4 = document.createElement("input");
  	input4.setAttribute("type", "hidden");
  	input4.setAttribute("name", "hours");
  	input4.value = $('#form-working-hours')[0].innerText;
  	form.appendChild(input4);
	// minutes
  	var input5 = document.createElement("input");
  	input5.setAttribute("type", "hidden");
  	input5.setAttribute("name", "minutes");
  	input5.value = $('#form-working-minutes')[0].innerText;
  	form.appendChild(input5);
  	// Achievement Star
  	var input6 = document.createElement("input");
  	input6.setAttribute("type", "hidden");
  	input6.setAttribute("name", "achievement");
  	input6.value = $('#form-data-star').data('value');
  	form.appendChild(input6);
	// Notes textarea-div
  	var input7 = document.createElement("input");
  	input7.setAttribute("type", "hidden");
  	input7.setAttribute("name", "notes");
  	input7.value = $('#notes-form').html();
  	form.appendChild(input7);
  	// Tags
  	var input8 = document.createElement("input");
  	input8.setAttribute("type", "hidden");
  	input8.setAttribute("name", "tags");
  	input8.value = $('#tag-section').data('tags');
  	form.appendChild(input8);

  	//form.setAttribute("method","get");
  	form.submit();

  });


  // For Event
  $('#form-event-submit').on('click', function(){
  	var form = $('#form-event')[0];
  	// Create hidden input fields corresponding to each button etc. in the form
  	// first field will indicate whether it's a work or an event
  	var input1 = document.createElement("input");
  	input1.setAttribute("type", "hidden");
  	input1.setAttribute("name", "formkind");
  	input1.value = "event";
  	form.appendChild(input1);
  	// date
  	var input3 = document.createElement("input");
  	input3.setAttribute("type", "hidden");
  	input3.setAttribute("name", "date");
  	// first date is "Wed Jun 2015 - Today"
  	// strip off the Today with slice
  	input3.value = $('#date-form-button-event')[0].innerText.slice(0,15);
  	form.appendChild(input3);
  	// Achievement Star
  	var input6 = document.createElement("input");
  	input6.setAttribute("type", "hidden");
  	input6.setAttribute("name", "achievement");
  	input6.value = $('#form-event-star').data('value');
  	form.appendChild(input6);
	// Notes textarea-div
  	var input7 = document.createElement("input");
  	input7.setAttribute("type", "hidden");
  	input7.setAttribute("name", "notes");
  	input7.value = $('#notes-form-event').html();
  	form.appendChild(input7);
  	// Tags
  	var input8 = document.createElement("input");
  	input8.setAttribute("type", "hidden");
  	input8.setAttribute("name", "tags");
  	input8.value = $('#event-tag-section').data('tags');
  	form.appendChild(input8);

	/*
	var input9 = document.createElement("input");
  	input9.setAttribute("type", "hidden");
  	input9.setAttribute("name", "venue");
  	input9.value = 'barber shop';
  	form.appendChild(input9);  
  	*/

  	form.submit();

  }); 
  //------- End of Form submission in Data through javascript -------//




// --------------End of code for Data specifically -------------//  

});
     