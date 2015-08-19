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

# to keep next achievement page cursor
class AchievementsCursor(ndb.Model):
	cursor = ndb.StringProperty(required = True);	

# to keep next project search result cursor
class ProjectSearchCursor(ndb.Model):
	cursor = ndb.StringProperty(required = True);	

		
class Projects(ndb.Model):
	# Set Account as the parent of a Project
	projectName = ndb.StringProperty(required = True)
	projectDescription = ndb.TextProperty()
	projectCreated = ndb.DateProperty(auto_now_add = True)
	# may be get rid off projectActive
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
	datakind = ndb.StringProperty(choices = ["work", "event"], indexed = False)
	isAchievement = ndb.BooleanProperty(default = False) #indexed
	notes = ndb.TextProperty()
	tags = ndb.StringProperty(repeated = True, indexed = False)
	# normalized tags eg. "App Engine" --> "appengine" - computed property
	normtags = ndb.ComputedProperty(lambda self: self._normalize_tags(), repeated = True)
	project = ndb.KeyProperty(Projects)
	projectName = ndb.StringProperty(indexed = False)
	#isWorkProductive = ndb.BooleanProperty(indexed = False)
	hoursWorked = ndb.FloatProperty(indexed = False)
	
	def _normalize_tags(self):
		tags = self.tags
		first_level = [t.lower().replace(' ', '') for t in tags] # hajj house as hajjhouse
		#second_level = [] # 'hajj house' as 'hajj' and 'house'
		#for tag in tags:
		#	second_level += [t.lower() for t in tag.split(' ') if t]

		return first_level# + second_level


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



def make_projects_dict(p):
	
	return {'pname': p.projectName, 
			'pdesc': p.projectDescription,
			'pactive': p.projectActive,
			'isprod': p.projectProductive,
			'pshared': p.projectShared,
			'plasthour': p.projectLastHour,
			'pentriesno': p.projectEntriesNo
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
			pdict = {} # hashtable with pid as the key

			qry = Projects.query(ancestor = user_ent_key).order(-Projects.projectLastAccessed)
			all_projects = qry.fetch()

			for p in all_projects:
				pbox.append({'projectId':p.key.id()}) 
				pdict[p.key.id()] = make_projects_dict(p)

			
			projects = {'pbox': pbox, 'pdict': pdict}		
			self.response.out.write(json.dumps(projects))		


# through Ajax POST request
class AddProjectAjax(Handler):
	def post(self):
		
		user = users.get_current_user()
		if user is None: 
			self.redirect(users.create_login_url('/welcome'))
			
		else:
			user_ent_key = ndb.Key(Account, user.user_id())	
			pname = self.request.get('pname')
			#logging.error(pName)
			pdesc = self.request.get('pdesc')
			isprod = self.request.get('isprod') == 'true'
			# not absolutely necessary as we are checking for clashes in the client side
			p_cursor = ndb.gql("SELECT * FROM Projects WHERE ANCESTOR IS :1", user_ent_key)
			all_projects = list(p_cursor)
			all_projects_name = [p.projectName for p in all_projects]
			if (pname and len(pname) <= 40):
				if (pname not in all_projects_name):
					pro = Projects(parent = user_ent_key, 
								   projectName=pname, 
								   projectDescription=pdesc,
								   projectProductive = isprod)
					pkey = pro.put()
					new_project = make_projects_dict( pkey.get() )
					self.response.out.write(json.dumps({'response': 0, 'project':new_project,'proj':{'projectId':pkey.id()} })) # 0 means success
				else:
					self.response.out.write(json.dumps({'response': 1})) # 1 means already exists
			else:
				self.response.out.write(json.dumps({'response': 2})) # 2 means empty name - can't occur 


# Edit multiple projects at once
class EditProjectsAjax(Handler):
	
	def post(self):
		user = users.get_current_user()
		if user is None: 
			self.redirect(users.create_login_url('/welcome'))
			
		else:
			user_ent_key = ndb.Key(Account, user.user_id())
			edits = json.loads(self.request.get('editedprojs')) 
			logging.error('\n---------------\n'+str(edits)+'\n-------------\n')
			projectObjects = ndb.get_multi([ndb.Key( 'Projects', int(p['pid']), parent = user_ent_key) for p in edits])
			
			
			for i, p in enumerate(projectObjects):
				p.projectName = edits[i]['pname']
				p.projectDescription = edits[i]['pdesc']
				p.projectProductive = edits[i]['isprod']
			
			ndb.put_multi(projectObjects)	

			self.response.out.write(json.dumps({'response': 'success'})) # success			




# transaction to change project last accessed and put the entry
@ndb.transactional
def commit_entry_transaction(entry, projectObject):
	
	if projectObject is not None:
		projectObject.projectLastAccessed = datetime.datetime.now()
		projectObject.projectLastHour = entry['hoursWorked']
		projectObject.projectEntriesNo = projectObject.projectEntriesNo + 1
		future1 = projectObject.put_async()
		future2 = Entry(**entry).put_async()
		future1.get_result()
		future2.get_result()
	else:
		Entry(**entry).put()	


# through Ajax POST request
class MakeEntryAjax(Handler):

	def post(self):	
		user = users.get_current_user()
		if user is None: 
			self.redirect(users.create_login_url('/welcome'))
			
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
			isAchievement = True if(self.request.get('achievement') == 'true') else False
			
			# notes
			notes = self.request.get('notes')
	
			#tags
			# convert space seperated string to list of strings
			#tags = str(urllib.unquote(self.request.get('tags'))).split(',')
			tags = json.loads(self.request.get('tags'))
			#logging.error('\n---------\n'+str(tags)+'--------\n'+str(len(tags))+'-------------\n---------')
			if len(tags) > 10:
				tags = []

			response = 0
			projectObject = None # remains None for event	
			#logging.error(self.request.get('formkind'))
			formkind = str( (self.request.get('formkind') ) ) 
			if formkind == 'work':
				# project id
				project = int( self.request.get('pid') )
				#projectName = self.request.get('pname')
				#isproductive = self.request.get('isprod') == 'true'
				projectKey = ndb.Key(Account, user.user_id(), Projects, project)
				# check if the same project on the same day already exists!
				conflict = Entry.query(ancestor = user_ent_key).filter(Entry.date==ndb_date, Entry.project==projectKey).fetch();	
				logging.error('\n-----\n-------'+str(conflict)+'\n-----\n-----\n')

				if len(conflict) == 0:
					projectObject = projectKey.get()
					projectName = projectObject.projectName;
					#isproductive = projectObject.projectProductive
					# working time
					h = self.request.get('hours', default_value=0)
					m = self.request.get('minutes', default_value=0)
					hours = int(h) + int(m)/60.0

					entry.update({'parent': user_ent_key,
						 	'datakind': formkind,
						 	'project': projectKey, 
						 	'projectName': projectName,
						 	'notes': notes,
						 	'date':  ndb_date,	
						 	'hoursWorked': hours,
						 	'isAchievement': isAchievement,
						  	'tags': tags 
						 	  })
				else:
					response = 1

			else:
				entry.update({'parent': user_ent_key,
							'datakind': formkind,
							'notes': notes,
							'date': ndb_date,	
							'isAchievement':  isAchievement,
							'tags':  tags
						  })	

			# call the transaction to change project last accessed and put entry
			if not response:
				commit_entry_transaction(entry, projectObject)
			
			self.response.out.write(json.dumps({'response': response})) # 0 means success


class EditEntryAjax(Handler):

	def post(self):	
		user = users.get_current_user()
		if user is None: 
			self.redirect(users.create_login_url('/welcome'))
			
		else:
			user_ent_key = ndb.Key(Account, user.user_id())
			eid = self.request.get('eid')
			ekey = ndb.Key(Account, user.user_id(), Entry, int(eid))
			# IsAchievement
			isAchievement = True if(self.request.get('achievement') == 'true') else False
			# notes
			notes = self.request.get('notes')
			#tags = str(urllib.unquote(self.request.get('tags'))).split(',')
			tags = json.loads(self.request.get('tags'))
			
			if len(tags) > 10:
				tags = []

			# working time
			h = self.request.get('hours', default_value=0)
			m = self.request.get('minutes', default_value=0)
			hours = int(h) + int(m)/60.0
			
			entry = ekey.get()
			#logging.error('\n---------\n'+str(isAchievement)+'--------\n-------------\n---------')
			entry.notes = notes
			entry.hoursWorked = hours
			entry.isAchievement = isAchievement
			entry.tags = tags 
			
			entry.put()		
			self.response.out.write(json.dumps({'response': 'success'}))	
				
				


# decrement projectEntriesNo
@ndb.transactional
def delete_entry_transaction(ekey, pkey):
	
	projectObject = pkey.get()
	if projectObject:
		projectObject.projectEntriesNo = 0 if projectObject.projectEntriesNo-1 < 0 else projectObject.projectEntriesNo-1
		future1 = projectObject.put_async()

	ekey.delete()
	future1.get_result()


class DeleteEntryAjax(Handler):
	def post(self):	
		user = users.get_current_user()
		if user is None: 
			self.redirect(users.create_login_url('/welcome'))
			
		else:
			user_ent_key = ndb.Key(Account, user.user_id())
			eid = self.request.get('eid')
			ekey = ndb.Key(Account, user.user_id(), Entry, int(eid))
			
			pid = self.request.get('pid')
			if pid:
				pkey = ndb.Key(Account, user.user_id(), Projects, int(pid))
				delete_entry_transaction(ekey, pkey)
			else:
				ekey.delete()	

			self.response.out.write(json.dumps({'response': 'success'}))


	



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


# function returns a python dictionary- 
# representation of an entry object
def make_entry_dict(e):

	dateString = utils.date_string(e.date)
	isWork = e.datakind == 'work'
	pid = None
	if e.project:
		pid = e.project.id()

	return {'eid':e.key.id() ,'isWork': isWork, 'date': dateString, 'isachiev': e.isAchievement,
			'notes': e.notes, 'tags': e.tags, 'pid': pid, 'hrs': e.hoursWorked};
		



# Returns all entries
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



# Tag Search
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



# Project Search - Return Entries corresponding to a project
class FilterProjectAjaxHandler(Handler):
	# post because we are writing to DB - cursor
	def post(self):
		user = users.get_current_user()
		if user is None: 
			self.redirect('/welcome')
			
		else:
			user_id = user.user_id()
			user_ent_key = ndb.Key(Account, user_id)
			pid = int(self.request.get('pid', default_value=None))

			if pid:
				# only if pid is sent, we can search for the project
				projectKey = ndb.Key(Account, user.user_id(), Projects, pid)
				#projectObject = projectKey.get()
				#projectName = projectObject.projectName;
				#isproductive = projectObject.projectProductive
				cur_id = self.request.get('cursor', default_value=None)
				start_cursor = None
				cursor_key = None
				cursor_obj = None

				if cur_id is not None:
					# load more
					cursor_key = ndb.Key('ProjectSearchCursor', int(cur_id), parent = user_ent_key)
					cursor_obj = memcache.get(user_id+'filter-project-cursor')
					if cursor_obj is None:
						cursor_obj = cursor_key.get()
				
					start_cursor = Cursor(urlsafe = cursor_obj.cursor)	

				# Search only if the key exists
				#p = projectKey.get()
				#pname = p.projectName
				#logging.error('------\n-------\n'+pname+'\n-----------')	.filter(Entry.project==projectKey)	
				qry = Entry.query(ancestor = user_ent_key).filter(Entry.project==projectKey).order(-Entry.date)	
				entries, next_cursor, more = qry.fetch_page(5, start_cursor=start_cursor)
				#entries = qry.fetch()
				#next_cursor = None
				#more = False

				#for e in entries:
				#	if e.projectName == pname:
				#		if e.project == projectKey:
				#			logging.info('------\nBoth Matched-------\n'+pname+'\n-----------')	
				#		else:
				#			logging.error('------\nName Matched But not Key-------\n'+pname+'\n'+str(projectKey)+'\n'+str(e.project)+'-----------')		


				if next_cursor is not None:

					if cur_id is not None:
						cursor_obj.cursor = next_cursor.urlsafe()
						cursor_obj.put()
						memcache.set(user_id+'filter-project-cursor', cursor_obj)

					else:	
						all_cursors_query = ndb.gql("SELECT * FROM ProjectSearchCursor WHERE ANCESTOR IS :1", user_ent_key)
						saved_cursor = list(all_cursors_query)
						if(saved_cursor): # not empty - update
							saved_cursor[0].cursor = next_cursor.urlsafe()
							cursor_key = saved_cursor[0].put()
							cur_id = cursor_key.id()
							memcache.set(user_id+'filter-project-cursor', saved_cursor[0], 1800)
							#logging.error('---------\n------Restored saved cursor--\n--------')
						else:	
							cursor_obj = ProjectSearchCursor(parent = user_ent_key, cursor = next_cursor.urlsafe())
							cursor_key = cursor_obj.put()
							cur_id = cursor_key.id()		
							memcache.set(user_id+'filter-project-cursor', cursor_obj, 1800)
						
				# entries is not json serializable because of date object
				results = []
				logging.error('------\n-------\n'+str(len(entries))+'\n-----------')
				for entry in entries:
					entrydict = make_entry_dict(entry)
					# to conform to the dailybox structure
					entrybox = {'entries':[entrydict]}
					entrybox['date'] = entrydict['date']
					results.append(entrybox) 
					
				search_results = {"response":0, "results": results, "more": more, "cursor": cur_id}
				#logging.error('------\n-------\n'+str(search_results)+'\n-----------')

			else:
				logging.error('------\n-------\nNo pid sent\n-----------')
				search_results = {"response":1} # projectId not found	

			self.response.out.write(json.dumps(search_results))		





# Return all achievement entries
class AchievementsAjaxHandler(Handler):
	# post because we are writing to DB - cursor
	def post(self):
		user = users.get_current_user()
		if user is None: 
			self.redirect('/welcome')
			
		else:
			user_id = user.user_id()
			user_ent_key = ndb.Key(Account, user_id)
			
			cur_id = self.request.get('cursor', default_value=None)
			start_cursor = None
			cursor_key = None
			cursor_obj = None

			if cur_id is not None:
				# load more
				cursor_key = ndb.Key('AchievementsCursor', int(cur_id), parent = user_ent_key)
				cursor_obj = memcache.get(user_id+'achievements-cursor')
				if cursor_obj is None:
					cursor_obj = cursor_key.get()

				start_cursor = Cursor(urlsafe = cursor_obj.cursor)	

			
			qry = Entry.query(ancestor = user_ent_key).filter(Entry.isAchievement==True).order(-Entry.date)	
			entries, next_cursor, more = qry.fetch_page(5, start_cursor=start_cursor)
			
			if next_cursor is not None:

				if cur_id is not None:
					cursor_obj.cursor = next_cursor.urlsafe()
					cursor_obj.put()
					memcache.set(user_id+'achievements-cursor', cursor_obj)

				else:	
					all_cursors_query = ndb.gql("SELECT * FROM AchievementsCursor WHERE ANCESTOR IS :1", user_ent_key)						
					saved_cursor = list(all_cursors_query)
					if(saved_cursor): # not empty - update
						saved_cursor[0].cursor = next_cursor.urlsafe()
						cursor_key = saved_cursor[0].put()
						cur_id = cursor_key.id()
						memcache.set(user_id+'achievements-cursor', saved_cursor[0], 1800)
						#logging.error('---------\n------Restored saved cursor--\n--------')
					else:	
						cursor_obj = AchievementsCursor(parent = user_ent_key, cursor = next_cursor.urlsafe())
						cursor_key = cursor_obj.put()
						cur_id = cursor_key.id()		
						memcache.set(user_id+'achievements-cursor', cursor_obj, 1800)

						
			# entries is not json serializable because of date object
			results = []
			logging.error('------\n-------\n'+str(len(entries))+'\n-----------')
			for entry in entries:
				entrydict = make_entry_dict(entry)
				# to conform to the dailybox structure
				entrybox = {'entries':[entrydict]}
				entrybox['date'] = entrydict['date']
				results.append(entrybox) 

			search_results = {"results": results, "more": more, "cursor": cur_id}
					#logging.error('------\n-------\n'+str(search_results)+'\n-----------')

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
			qry = Entry.query(ancestor = user_ent_key)
			data = qry.fetch()
			logging.error('------\n-------\n'+str(len(data))+'\n-----------')			
			#for d in data:
				#d.put()	

		self.response.out.write('Done!')		



app = webapp2.WSGIApplication([
	('/', HomeHandler),
    ('/addproject', AddProjectAjax),
    ('/editprojs', EditProjectsAjax),
    ('/makeentry', MakeEntryAjax),
    ('/editentry', EditEntryAjax),
    ('/deleteentry', DeleteEntryAjax),
    ('/login', LoginHandler),
    ('/welcome', WelcomePageHandler),
    ('/ajaxhome', AjaxHomeHandler),
    ('/searchtags', AjaxTagsHandler),
    ('/ajaxprojects', AjaxProjectsHandler),
    ('/achievementsajax', AchievementsAjaxHandler),
    ('/filterproject', FilterProjectAjaxHandler),
    ('/update', UpdateHandler)
   ], debug=True)

#@webapp_add_wsgi_middleware
#def main(app):


#if __name__ == "__main__":
#	main(app)
