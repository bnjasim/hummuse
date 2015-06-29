# Created on 27-Jan-2015-Tuesday
# Wireframe created
__author__ = 'Binu Jasim (bnjasim@gmail)'
__website__ = 'www.hummuse.com'

import webapp2
import os
import jinja2
from google.appengine.ext import ndb
from google.appengine.api import users
import logging
import datetime
import urllib
import math

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
	
		
class Projects(ndb.Model):
	# Set Account as the parent of a Project
	projectName = ndb.StringProperty(required = True)
	projectDescription = ndb.TextProperty()
	projectCreated = ndb.DateProperty(auto_now_add = True)
	projectActive = ndb.BooleanProperty(default = True)
	projectShared = ndb.BooleanProperty(default = False)
	projectProductive = ndb.BooleanProperty(default = True)
	#projectPriority = ndb.FloatProperty(default = 1) # got rid of this
	# + how many times its used in the past
	#projectColor = ndb.StringProperty(default = '#ffffff')

# Base class for Work and Event
class Entry(ndb.Model):
	# Need to set Account as the parent of every entry
	date = ndb.DateProperty(required = True)	
	isAchievement = ndb.BooleanProperty(default = False)
	notes = ndb.TextProperty()
	tags = ndb.StringProperty(repeated = True)
	project = ndb.KeyProperty(Projects)
	projectName = ndb.StringProperty()
	isWorkProductive = ndb.BooleanProperty()
	hoursWorked = ndb.FloatProperty()
	datakind = ndb.StringProperty(choices = ["work", "event"])


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
			self.redirect(users.create_login_url('/new_user'))
			
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


class DeleteProjectHandler(Handler):
	
	def post(self):
		user = users.get_current_user()
		if user is None: 
			self.redirect(users.create_login_url('/new_user'))
			
		else:
			user_ent_key = ndb.Key(Account, user.user_id())
			project_id = self.request.get('key_id')
			project_key = ndb.Key( 'Projects', int(project_id), parent = user_ent_key )
			p = project_key.get()
			if (p):
				p.projectActive = False
				p.put()
				message = format("Project \""+ p.projectName +"\" deleted successfully! ")
			else: message = "Couldn't delete"
			self.redirect('/project?dmessage='+message)

class MakeEntryHandler(Handler):
	
	def get(self):
		user = users.get_current_user()
		if user is None: 
			self.redirect(users.create_login_url('/new_user'))
			
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
			#fileds in Data
			#date = ndb.DateProperty(required = True)	
			#isAchievement = ndb.BooleanProperty(default = False)
			#notes = ndb.TextProperty()
			#tags = ndb.StringProperty(repeated = True)
			#project = ndb.KeyProperty(Projects)
			#hoursWorked = ndb.FloatProperty()
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
				hours = int(self.request.get('hours')) + int(self.request.get('minutes'))/60.0

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
		

# A class to reformat the query results 
# based on the date
# used in the HomeHandler to display the entries
class DaysBox:
	def __init__(self, date):
		self.dateString = date # eg. Sat Jun 27 2015
		self.entries = []
		self.totalHours = 0 # total productive work in a day
		self.totalMinutes = 0

		
	def append(self, entry):
		self.entries.append(entry)	

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

			qry = Entry.query(ancestor = user_ent_key).order(-Entry.date, Entry.project)	
			entries = qry.fetch(20); # first 10 entries 
			# Need to restructure the query result by aggregating over the date 
			entries_by_date = []
			#t = datetime.date.today() # temporary date
			#t = t.replace(day = 30, month = 12, year = 1970) # initialization
			t = "Man Jal 40 2222" # of the form - Mon Jan 30 2012
			daybox = DaysBox(t) # initialization - should avoid this, but don't know how
			total_hours = 0 # total productive time in a day

			for entry in entries:
				entrybox = EntryBox(entry)
				if entrybox.dateString != t:
					daybox.totalHours = int( math.floor(total_hours) )
					daybox.totalMinutes = int( math.ceil( (total_hours - daybox.totalHours) * 60))
					total_hours = 0
					t = entrybox.dateString # keep track of current entries' date
					daybox = DaysBox(t) # create a new date box and put all relevant entries there
					entries_by_date.append(daybox)
				daybox.append(entrybox)
				total_hours = total_hours + (entry.hoursWorked if entry.isWorkProductive and
											 entry.datakind == 'work' else 0)

			self.render('home.html',
						 user_name = utils.shorten_name(user.nickname()), 
						 logout_url = logout_url,
						 entries_by_date = entries_by_date
						 )


class WelcomePageHandler(Handler):
	def get(self):
		self.render("welcome.html")

app = webapp2.WSGIApplication([
	('/', HomeHandler),
    ('/projects', AddProjectHandler),
    ('/delproject', DeleteProjectHandler),
    ('/data', MakeEntryHandler),
    ('/login', LoginHandler),
    ('/welcome', WelcomePageHandler)
], debug=True)

#@webapp_add_wsgi_middleware
#def main(app):


#if __name__ == "__main__":
#	main(app)
