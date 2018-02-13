from flask_table import Table, Col, LinkCol

class Results(Table):
    id = Col('Id', show=False)
    #artist = Col('Room Number')
    title = Col('Room Number') ###############################
    release_date = Col('Name')
    publisher = Col('Branch')
    media_type = Col('Hostel')
    #edit = LinkCol('Edit', 'edit', url_kwargs=dict(id='id'))