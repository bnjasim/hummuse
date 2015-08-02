# Created on 27-Jan-2015-Tuesday
# Wireframe created
__author__ = 'Binu Jasim (bnjasim@gmail)'
__website__ = 'www.hummuse.com'

import webapp2
import os
import jinja2
from google.appengine.ext import ndb
from google.appengine.api import users
from google.appengine.api import memcache
from google.appengine.datastore.datastore_query import Cursor
import logging
import datetime
import urllib
import math
import json

import utils

template_dir = os.path.join(os.path.dirname(__file__), 'templates')
jinja_env = jinja2.Environment(loader = jinja2.FileSystemLoader(template_dir), 
								autoescape = True)
# username is not Id because users might change their user name or email
# lateron add username and password for anonymous login
# Add OAuth - may need to store refresh token etc.
class Account(ndb.Model):
	nickname = ndb.StringProperty()
	email = ndb.StringProperty()
	userCreated = ndb.DateTimeProperty(auto_now_add = True)
	#accountType = ndb.IntegerProperty(default = 0)
	# account type -> 0:anonymous, 1:google-oauth 2:facebook etc.

	@classmethod
	@ndb.transactional
	def my_get_or_insert(cls, id, **kwds):
		key = ndb.Key(cls, id)
		ent = key.get()
		if ent is not None:
			return False  # False meaning "Already existing"
		ent = cls(**kwds)
		ent.key = key
		ent.put()
		return True  # True meaning "Newly created"

class OpaqueCursor(ndb.Model):
	# Set Account as the parent 
	# as different users should be able to store different cursor
	cursor = ndb.StringProperty(required = True);	

# to keep next tag search result cursor
class SearchCursor(ndb.Model):
	cursor = ndb.StringProperty(required = True);	
		
class Projects(ndb.Model):
	# Set Account as the parent of a Project
	projectName = ndb.StringProperty(required = True)
	projectDescription = ndb.TextProperty()
	projectCreated = ndb.DateProperty(auto_now_add = True)
	projectActive = ndb.BooleanProperty(default = True)
	projectShared = ndb.BooleanProperty(default = False)
	projectProductive = ndb.BooleanProperty(default = True)
	projectLastAccessed = ndb.DateTimeProperty(auto_now_add = True)
	projectLastHour = ndb.FloatProperty(indexed = False, default = 0.5)
	projectEntriesNo = ndb.IntegerProperty(default = 0)
	#projectColor = ndb.StringProperty(default = '#ffffff')

# Base class for Work and Event
class Entry(ndb.Model):
	# Need to set Account as the parent of every entry
	date = ndb.DateProperty(required = True)	
	datakind = ndb.StringProperty(choices = ["work", "event"])
	isAchievement = ndb.BooleanProperty(default = False, indexed = False)
	notes = ndb.TextProperty()
	tags = ndb.StringProperty(repeated = True, indexed = False)
	# normalized tags eg. "App Engine" --> "appengine" - computed property
	normtags = ndb.ComputedProperty(lambda self: self._normalize_tags(), repeated = True)
	project = ndb.KeyProperty(Projects)
	projectName = ndb.StringProperty(indexed = False)
	isWorkProductive = ndb.BooleanProperty(indexed = False)
	hoursWorked = ndb.FloatProperty(indexed = False)
	
	def _normalize_tags(self):
		return [t.lower().replace(' ', '') for t in self.tags]



class Tags(ndb.Model):
	# Account is the parent as usual
	tagName = ndb.StringProperty(required = True)

class Handler(webapp2.RequestHandler):
	def write(self, *a, **kw):
		self.response.out.write(*a, **kw)
	
	def render_str(self, template, **params):
		return (jinja_env.get_template(template)).render(params)
		
	def render(self, template, **html_add_ins):
		self.write(self.render_str(template, **html_add_ins))


class AddProjectHandler(Handler):

	def get(self):
		user = users.get_current_user()
		if user is None: 
			self.redirect(users.create_login_url('/welcome'))
			
		else:
			logout_url = users.create_logout_url('/')
			user_ent_key = ndb.Key(Account, user.user_id())	

			#form_warning = self.request.get('warning')
			#d_message = self.request.get('dmessage')
			#pName = self.request.get('pname')
			#pNotes = self.request.get('pnotes')
			#logging.error(type(pname))
			p_cursor = ndb.gql("SELECT * FROM Projects WHERE ANCESTOR IS :1", user_ent_key)
			all_projects = list(p_cursor)
			active_projects = [p for p in all_projects if p.projectActive is not False]
			self.render("projects.html", 
					     #pList = active_projects, 
					     user_name = utils.shorten_name(user.nickname()), 
					     logout_url = logout_url#,
					     #form_warning = form_warning,
					     #delete_message = d_message,
					     #pName = pName,
					     #pNotes = pNotes
					     )
	
	def post(self):
		
		user = users.get_current_user()
		if user is None: 
			self.redirect(users.create_login_url('/welcome'))
			
		else:
			user = users.get_current_user()
			user_ent_key = ndb.Key(Account, user.user_id())	
			pName = self.request.get('pname')
			logging.error(pName)
			pDesc = self.request.get('pdesc')
			p_cursor = ndb.gql("SELECT * FROM Projects WHERE ANCESTOR IS :1", user_ent_key)
			all_projects = list(p_cursor)
			all_projects_name = [p.projectName for p in all_projects]
			if (pName):
				if (pName not in all_projects_name):
					pro = Projects(parent = user_ent_key, 
								   projectName=pName, 
								   projectDescription=pDesc)
					pro.put()
					self.redirect('/projects')
				else:
					self.redirect(format('/project?warning=The Project '+str(pName)+' already exists!&pname='+str(pName)+'&pnotes='+str(pNotes)))
			else:
				self.redirect(format('/project?warning=Project Title is too short&pnotes='+str(pNotes)))


def make_projects_dict(p):
	
	return {'projectName': p.projectName, 'project': p.key.id(),
			'projectDesc': p.projectDescription,
			'projectActive': p.projectActive,
			'projectProductive': p.projectProductive,
			'projectShared': p.projectShared,
			'projectLastHour': p.projectLastHour,
			'projectEntriesNo': p.projectEntriesNo
			}


# returns the list of all projects			
class AjaxProjectsHandler(Handler):

	def get(self):
		user = users.get_current_user()
		if user is None: 
			self.redirect('/welcome')
			
		else:
			user_id = user.user_id()
			user_ent_key = ndb.Key(Account, user_id)

			pbox = []

			qry = Projects.query(ancestor = user_ent_key).order(-Projects.projectLastAccessed)
			all_projects = qry.fetch()
			for p in all_projects:
				pbox.append(make_projects_dict(p))

			
			projects = {'pbox': pbox}		
			self.response.out.write(json.dumps(projects))		


# through Ajax POST request
class AddProjectAjax(Handler):
	def post(self):
		
		user = users.get_current_user()
		if user is None: 
			self.redirect(users.create_login_url('/welcome'))
			
		else:
			user = users.get_current_user()
			user_ent_key = ndb.Key(Account, user.user_id())	
			pName = self.request.get('pname')
			logging.error(pName)
			pDesc = self.request.get('pdesc')
			pProd = self.request.get('pprod') == 'true'
			p_cursor = ndb.gql("SELECT * FROM Projects WHERE ANCESTOR IS :1", user_ent_key)
			all_projects = list(p_cursor)
			all_projects_name = [p.projectName for p in all_projects]
			if (pName):
				if (pName not in all_projects_name):
					pro = Projects(parent = user_ent_key, 
								   projectName=pName, 
								   projectDescription=pDesc,
								   projectProductive = pProd)
					pro.put()
					self.response.out.write(json.dumps({'response': 0})) # 0 means success
				else:
					self.response.out.write(json.dumps({'response': 1})) # 1 means already exists
			else:
				self.response.out.write(json.dumps({'response': 2})) # 2 means empty name - can't occur 


class DeleteProjectHandler(Handler):
	
	def post(self):
		user = users.get_current_user()
		if user is None: 
			self.redirect(users.create_login_url('/welcome'))
			
		else:
			user_ent_key = ndb.Key(Account, user.user_id())
			project_id = self.request.get('key_id')
			project_key = ndb.Key( 'Projects', int(project_id), parent = user_ent_key )
			p = project_key.get()
			if (p):
				p.projectActive = False
				p.put()
				message = format("Project \""+ p.projectName +"\" deleted successfully! ")
				self.redirect(users.create_login_url('/new_user'))



class MakeEntryHandler(Handler):
	
	def get(self):
		user = users.get_current_user()
		if user is None: 
			self.redirect(users.create_login_url('/welcome'))

		else:
			logout_url = users.create_logout_url('/')
			user_ent_key = ndb.Key(Account, user.user_id())	
			
			#form_warning = self.request.get('form_warning')
			#message = self.request.get('message')
			p_cursor = ndb.gql("SELECT * FROM Projects WHERE ANCESTOR IS :1", user_ent_key)
			all_projects = list(p_cursor)
			active_projects = [p for p in all_projects if p.projectActive is not False]

			
			self.render("data.html", 
						 user_name = utils.shorten_name(user.nickname()), 
					     logout_url = logout_url,
					     projects = active_projects
					    # form_warning = form_warning,
					    # special_message = message
					    )

	def post(self):
		user = users.get_current_user()
		if user is None: 
			self.redirect(users.create_login_url('/new_user'))
			
		else:
			user_ent_key = ndb.Key(Account, user.user_id())	
			entry = {}
			# date - a string of the format "Wed Jun 24 2015" - 15 characters
			date = self.request.get('date') 
			t = datetime.date.today()
			ndb_date = t.replace(day = int(date[8:10]),
								 month = utils.months[ date[4:7] ],
								 year = int(date[11:15])
								 )
			
			# IsAchievement
			if(self.request.get('achievement') == 'true'):
				isAchievement = True
			else:
				isAchievement = False	
			
			# notes
			notes = self.request.get('notes')
	
			#tags
			# convert space seperated string to list of strings
			#logging.error(self.request.get('tags'))
			tags = str(urllib.unquote(self.request.get('tags'))).split(',')
			

			#logging.error(self.request.get('formkind'))
			formkind = str( (self.request.get('formkind') ) ) 
			if formkind == 'work':
				# project id
				project = int( self.request.get('project') )
				projectKey = ndb.Key(Account, user.user_id(), Projects, project)
				projectObject = projectKey.get()
				projectName = projectObject.projectName;
				isWorkProductive = projectObject.projectProductive
				# working time
				h = self.request.get('hours', default_value=0)
				m = self.request.get('minutes', default_value=0)
				logging.error('\n-----\n-------'+str(h)+" hours & "+str(m)+" mins"+'\n-----\n-----\n')
				hours = int(h) + int(m)/60.0

				entry.update({'parent': user_ent_key,
						 	'datakind': formkind,
						 	'project': projectKey, 
						 	'projectName': projectName,
						 	'isWorkProductive': isWorkProductive,
						 	'notes': notes,
						 	'date':  ndb_date,	
						 	'hoursWorked': hours,
						 	'isAchievement': isAchievement,
						  	'tags': tags 
						 	  })

			else:
				entry.update({'parent': user_ent_key,
							'datakind': formkind,
							'notes': notes,
							'date': ndb_date,	
							'isAchievement':  isAchievement,
							'tags':  tags
						  })	

			
			Entry(**entry).put()
			self.redirect('/data')	


# Registers new users in Account
class LoginHandler(webapp2.RequestHandler):
	"Redirected to here from the login page. So always user is not None"

	def get(self):
		user = users.get_current_user()
		if user is None: 
			self.redirect(users.create_login_url('/login'))
		
		else:
			user_id = user.user_id()
			nickname = utils.shorten_name(user.nickname())
			email = user.email()
			status = Account.my_get_or_insert(user_id, 
											  nickname = nickname, 
											  email = email)
			self.redirect('/?fresh_user=' + str(status))			
		


# function returns a python dictionary- 
# representation of an entry object
def make_entry_dict(e):

	dateString = utils.date_string(e.date)
	isWork = e.datakind == 'work'

	return {'isWork': isWork, 'date': dateString, 'isachiev': e.isAchievement,
			'notes': e.notes, 'tags': e.tags, 'proj': e.projectName, 'hrs': e.hoursWorked,
			'isproductive': e.isWorkProductive};
		



# create a new Entry for calculations
# such as hours and minutes from hoursWorked float property
class EntryBox:
	def __init__(self, e):
		self.dateString = (utils.weeks[e.date.weekday()] + ' ' +
						  utils.months_array[e.date.month-1] + '-' +
						  str(e.date.day) + '-' + str(e.date.year) )

		self.datakind = e.datakind
		self.isAchievement = e.isAchievement
		self.notes = e.notes
		self.tags = e.tags
		self.projectName = e.projectName
		self.hoursWorked = e.hoursWorked 
		if e.datakind == 'work':
			self.hours = int( math.floor(e.hoursWorked) )
			self.minutes = int( math.ceil( (e.hoursWorked - self.hours) * 60	) )
		# If the note really large then we have to hide some parts
		notes = self.notes
		note_limit = 150 # show first 150 characters - but includes html tags aswell
		isNotesLarge = len(notes) > note_limit
		self.isNotesLarge = isNotesLarge
		# if note is large find an appropriate place to wrap
		# Find the next </div> or </li> in notes
		if isNotesLarge:
			rem_notes = notes[note_limit:]
			min_div = rem_notes.find('</div>')
			min_li = rem_notes.find('</li>')
			pos = min(min_div, min_li)
			len_tag = 5 if min_li < min_div else 6

			notesCutShort = (notes[ : note_limit + pos] +
							   '... <a class="show-more-notes">(more)</a>' +
							   rem_notes[pos: pos+len_tag] +
							   utils.closeAllTags(rem_notes[pos:])
							  )
			self.notesCutShort = notesCutShort
			
		

class HomeHandler(Handler):
	def get(self):
		user = users.get_current_user()
		if user is None: 
			self.redirect('/welcome')
			
		else:
			logout_url = users.create_logout_url('/')
			user_ent_key = ndb.Key(Account, user.user_id())
			# All the data rendering is now done by AjaxHomeHandler
			self.render('home.html',
						 user_name = utils.shorten_name(user.nickname()), 
						 logout_url = logout_url
						 )

class AjaxHomeHandler(Handler):

	def post(self):
		user = users.get_current_user()
		if user is None: 
			self.redirect('/welcome')
			
		else:
			user_id = user.user_id()
			#logging.error('---------\n------'+user_id+'--\n--------')
			user_ent_key = ndb.Key(Account, user_id)

			# this is opaque id of cursor sent from the client
			cursor_id = self.request.get('cursor', default_value=None)
			cursor_obj = None
			cursor_key = None
			start_cursor = None

			if cursor_id:
				cursor_key = ndb.Key('OpaqueCursor', int(cursor_id), parent = user_ent_key)
				cursor_obj = memcache.get(user_id+'ajax-cursor')
				
				if cursor_obj is None:
					#logging.error('---------\n---------Cache Miss------')
					cursor_obj = cursor_key.get()

				start_cursor = Cursor(urlsafe = cursor_obj.cursor)

			#logging.error(self.request.get('cursor', default_value=None))
			qry = Entry.query(ancestor = user_ent_key).order(-Entry.date)	
			entries, next_cursor, more = qry.fetch_page(20, start_cursor=start_cursor)

			if cursor_id and next_cursor:
				cursor_obj.cursor = next_cursor.urlsafe()
				cursor_obj.put()
				memcache.set(user_id+'ajax-cursor', cursor_obj, 1800)
			elif next_cursor:	# refresh
				# check whether any cursor already present
				# otherwise we'll be recreating an OpaqueCursor entity for every refresh
				all_cursors_query = ndb.gql("SELECT * FROM OpaqueCursor WHERE ANCESTOR IS :1", user_ent_key)
				saved_cursor = list(all_cursors_query)
				if(saved_cursor): # not empty - update
					saved_cursor[0].cursor = next_cursor.urlsafe()
					cursor_key = saved_cursor[0].put()
					cursor_id = cursor_key.id()
					#memcache.delete('ajax-cursor')
					memcache.set(user_id+'ajax-cursor', saved_cursor[0], 1800)
					
				else: # first time ever user is saving a cursor -only happens once for a user
					# but may be better to separate from account creation for maintainability
					cursor_key = OpaqueCursor(parent = user_ent_key, cursor = next_cursor.urlsafe()).put()	
					cursor_id = cursor_key.id()

			# Need to restructure the query result by aggregating over the date 
			entries_by_date = [] # top level of json to return
			#t = datetime.date.today() # Sorry! datetime is not json serializable
			#t = t.replace(day = 30, month = 12, year = 1970) # initialization
			t = 'Mon Jun 31 2026' # incorrect date but in correct format
			todays_entries = [] # contains entries of a day
			
			for entry in entries:
				entrydict = make_entry_dict(entry)
				if utils.date_string(entry.date) != t:
					t = utils.date_string(entry.date) # keep track of current entries' date
					todays_entries = []
					daybox = {'date': t, 'entries': todays_entries} # create a new date box and put all relevant entries there
					entries_by_date.append(daybox)

				todays_entries.append(entrydict)
			
			whole_data = {"data": entries_by_date, "cursor": cursor_id, "more": more}
			self.response.out.write(json.dumps(whole_data))	






class AjaxTagsHandler(Handler):

	def post(self):
		user = users.get_current_user()
		if user is None: 
			self.redirect('/welcome')
			
		else:
			user_id = user.user_id()
			user_ent_key = ndb.Key(Account, user_id)
			tag = self.request.get('tag', default_value=None)
			cur_id = self.request.get('cursor', default_value=None)
			start_cursor = None
			cursor_key = None
			cursor_obj = None

			if cur_id is not None:
				# load more
				cursor_key = ndb.Key('SearchCursor', int(cur_id), parent = user_ent_key)
				cursor_obj = memcache.get(user_id+'tag-cursor')
				if cursor_obj is None:
					cursor_obj = cursor_key.get()
				
				start_cursor = Cursor(urlsafe = cursor_obj.cursor)	

			if tag is None or tag.replace(' ','') == '':
				self.response.out.write(json.dumps({}))

			else:
				tag = tag.lower().replace(' ', '')
				# later------ check if the tag is present in the Tags list
				# Now just search over entries
				qry = Entry.query(ancestor = user_ent_key).filter(Entry.normtags==tag).order(-Entry.date)	
				entries, next_cursor, more = qry.fetch_page(5, start_cursor=start_cursor)

				if next_cursor is not None:

					if cur_id is not None:
						cursor_obj.cursor = next_cursor.urlsafe()
						cursor_obj.put()
						memcache.set(user_id+'tag-cursor', cursor_obj)

					else:	
						all_cursors_query = ndb.gql("SELECT * FROM SearchCursor WHERE ANCESTOR IS :1", user_ent_key)
						saved_cursor = list(all_cursors_query)
						if(saved_cursor): # not empty - update
							saved_cursor[0].cursor = next_cursor.urlsafe()
							cursor_key = saved_cursor[0].put()
							cur_id = cursor_key.id()
							memcache.set(user_id+'tag-cursor', saved_cursor[0], 1800)
							#logging.error('---------\n------Restored saved cursor--\n--------')
						else:	
							cursor_obj = SearchCursor(parent = user_ent_key, cursor = next_cursor.urlsafe())
							cursor_key = cursor_obj.put()
							cur_id = cursor_key.id()		
							memcache.set(user_id+'tag-cursor', cursor_obj, 1800)

						
				# entries is not json serializable because of date object
				results = []
				for entry in entries:
					entrydict = make_entry_dict(entry)
					# to conform to the dailybox structure
					entrybox = {'entries':[entrydict]}
					entrybox['date'] = entrydict['date']
					results.append(entrybox) 

				search_results = {"results": results, "more": more, "cursor": cur_id}
				self.response.out.write(json.dumps(search_results))	



class WelcomePageHandler(Handler):
	def get(self):
		self.render("welcome.html")



class UpdateHandler(Handler):
	def get(self):
		user = users.get_current_user()
		if user is None: 
			self.redirect('/welcome')
			
		else:
			user_ent_key = ndb.Key(Account, user.user_id())
			qry = Projects.query(ancestor = user_ent_key)
			data = qry.fetch()

			for d in data:
				if 'projecthotness' in d._properties:
					del d._properties['projecthotness']				
					d.put()	

		self.response.out.write('Done!')		



app = webapp2.WSGIApplication([
	('/', HomeHandler),
    ('/projects', AddProjectHandler),
    ('/addproject', AddProjectAjax),
    ('/delproject', DeleteProjectHandler),
    ('/data', MakeEntryHandler),
    ('/login', LoginHandler),
    ('/welcome', WelcomePageHandler),
    ('/ajaxhome', AjaxHomeHandler),
    ('/searchtags', AjaxTagsHandler),
    ('/ajaxprojects', AjaxProjectsHandler),
    ('/update', UpdateHandler)
   ], debug=True)

#@webapp_add_wsgi_middleware
#def main(app):


#if __name__ == "__main__":
#	main(app)
